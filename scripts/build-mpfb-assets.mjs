import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'
import { MEASUREMENT_PROTOCOL } from '../src/data/measurementProtocol.js'
import { CIRCUMFERENCE_CALIBRATION } from '../src/data/circumferenceCalibration.js'

const sourceRoot = process.argv[2] || process.env.MPFB2_SOURCE

if (!sourceRoot) {
  throw new Error('Pass the local MPFB2 repository path: npm run assets:mpfb -- C:\\path\\to\\mpfb2')
}

const dataRoot = path.join(sourceRoot, 'src', 'mpfb', 'data')
const objectPath = path.join(dataRoot, '3dobjs', 'base.obj')
const targetRoot = path.join(dataRoot, 'targets')
const outputRoot = path.resolve(process.argv[3] || process.env.MPFB_OUTPUT_ROOT || path.join('public', 'assets', 'mpfb'))

if (!fs.existsSync(objectPath) || !fs.existsSync(targetRoot)) {
  throw new Error(`MPFB2 assets were not found below ${sourceRoot}`)
}

fs.mkdirSync(outputRoot, { recursive: true })

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function sha256File(filePath) {
  return sha256(fs.readFileSync(filePath))
}

function resolveSourceRevision() {
  const validate = (revision) => {
    const normalized = String(revision || '').trim().toLowerCase()
    if (!/^[a-f0-9]{40}$/.test(normalized)) {
      throw new Error('MPFB2 source revision must be an immutable 40-character git commit SHA.')
    }
    return normalized
  }
  if (process.env.MPFB2_REVISION) return validate(process.env.MPFB2_REVISION)
  try {
    return validate(execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }))
  } catch {
    throw new Error('The MPFB2 source revision is unavailable. Use a git checkout or set MPFB2_REVISION to its full commit SHA.')
  }
}

function parseBodyMesh() {
  const vertices = []
  const indices = []
  const bodyVertices = new Set()
  let group = ''

  for (const line of fs.readFileSync(objectPath, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.trim().split(/\s+/)
      vertices.push(Number(x), Number(y), Number(z))
      continue
    }

    if (line.startsWith('g ')) {
      group = line.slice(2).trim()
      continue
    }

    if (group !== 'body' || !line.startsWith('f ')) continue

    const face = line.slice(2).trim().split(/\s+/).map((token) => Number(token.split('/')[0]) - 1)
    for (const vertex of face) bodyVertices.add(vertex)
    for (let corner = 1; corner < face.length - 1; corner += 1) {
      indices.push(face[0], face[corner], face[corner + 1])
    }
  }

  const vertexCount = Math.max(...bodyVertices) + 1
  if (Math.min(...bodyVertices) !== 0 || bodyVertices.size !== vertexCount) {
    throw new Error('The MPFB body topology is no longer a contiguous leading vertex range.')
  }

  const positions = new Float32Array(vertices.slice(0, vertexCount * 3))
  const fitPositions = new Float32Array(vertices)
  const triangleIndices = new Uint32Array(indices)
  let minY = Infinity
  let maxY = -Infinity

  for (let index = 1; index < positions.length; index += 3) {
    minY = Math.min(minY, positions[index])
    maxY = Math.max(maxY, positions[index])
  }

  const headerBytes = 24
  const output = Buffer.alloc(headerBytes + positions.byteLength + triangleIndices.byteLength)
  output.write('MPFM', 0, 'ascii')
  output.writeUInt32LE(1, 4)
  output.writeUInt32LE(vertexCount, 8)
  output.writeUInt32LE(triangleIndices.length, 12)
  output.writeFloatLE(minY, 16)
  output.writeFloatLE(maxY, 20)
  Buffer.from(positions.buffer).copy(output, headerBytes)
  Buffer.from(triangleIndices.buffer).copy(output, headerBytes + positions.byteLength)

  fs.writeFileSync(path.join(outputRoot, 'body.mesh'), output)

  const fitHeaderBytes = 12
  const fitOutput = Buffer.alloc(fitHeaderBytes + fitPositions.byteLength)
  fitOutput.write('MPFF', 0, 'ascii')
  fitOutput.writeUInt32LE(1, 4)
  fitOutput.writeUInt32LE(fitPositions.length / 3, 8)
  Buffer.from(fitPositions.buffer).copy(fitOutput, fitHeaderBytes)
  fs.writeFileSync(path.join(outputRoot, 'fit.mesh'), fitOutput)

  return {
    vertexCount,
    fitVertexCount: fitPositions.length / 3,
    triangleCount: triangleIndices.length / 3,
    minY,
    maxY,
  }
}

function targetPaths() {
  const paths = new Set()
  const genders = ['female', 'male']
  const ages = ['young', 'old']
  const muscleLevels = ['minmuscle', 'averagemuscle', 'maxmuscle']
  const weightLevels = ['minweight', 'averageweight', 'maxweight']
  const cupLevels = ['mincup', 'averagecup', 'maxcup']
  const firmnessLevels = ['minfirmness', 'averagefirmness', 'maxfirmness']

  for (const gender of genders) {
    for (const age of ages) {
      for (const muscle of muscleLevels) {
        for (const weight of weightLevels) {
          paths.add(`macrodetails/universal-${gender}-${age}-${muscle}-${weight}`)
        }
      }
    }
  }

  // Female-first studio: retain the full authored body context when applying
  // proportion, height, and breast corrections instead of assuming an average body.
  for (const age of ages) {
    for (const muscle of muscleLevels) {
      for (const weight of weightLevels) {
        for (const proportions of ['uncommonproportions', 'idealproportions']) {
          paths.add(`macrodetails/proportions/female-${age}-${muscle}-${weight}-${proportions}`)
        }
        for (const height of ['minheight', 'maxheight']) {
          paths.add(`macrodetails/height/female-${age}-${muscle}-${weight}-${height}`)
        }
        for (const cup of cupLevels) {
          for (const firmness of firmnessLevels) {
            if (cup === 'averagecup' && firmness === 'averagefirmness') continue
            paths.add(`breast/female-${age}-${muscle}-${weight}-${cup}-${firmness}`)
          }
        }
      }
    }
  }

  const detailTargets = [
    'torso/measure-bust-circ-decr', 'torso/measure-bust-circ-incr',
    'torso/measure-waist-circ-decr', 'torso/measure-waist-circ-incr',
    'torso/measure-hips-circ-decr', 'torso/measure-hips-circ-incr',
    'torso/measure-shoulder-dist-decr', 'torso/measure-shoulder-dist-incr',
    'torso/measure-napetowaist-dist-decr', 'torso/measure-napetowaist-dist-incr',
    'hip/hip-scale-horiz-decr', 'hip/hip-scale-horiz-incr',
    'buttocks/buttocks-volume-decr', 'buttocks/buttocks-volume-incr',
    'neck/measure-neck-circ-decr', 'neck/measure-neck-circ-incr',
    'arms/measure-upperarm-circ-decr', 'arms/measure-upperarm-circ-incr',
    'arms/measure-upperarm-length-decr', 'arms/measure-upperarm-length-incr',
    'arms/measure-lowerarm-length-decr', 'arms/measure-lowerarm-length-incr',
    'arms/l-lowerarm-scale-horiz-decr', 'arms/l-lowerarm-scale-horiz-incr',
    'arms/r-lowerarm-scale-horiz-decr', 'arms/r-lowerarm-scale-horiz-incr',
    'arms/l-lowerarm-scale-depth-decr', 'arms/l-lowerarm-scale-depth-incr',
    'arms/r-lowerarm-scale-depth-decr', 'arms/r-lowerarm-scale-depth-incr',
    'hands/measure-wrist-circ-decr', 'hands/measure-wrist-circ-incr',
    'legs/measure-thigh-circ-decr', 'legs/measure-thigh-circ-incr',
    'legs/measure-calf-circ-decr', 'legs/measure-calf-circ-incr',
    'legs/measure-upperleg-height-decr', 'legs/measure-upperleg-height-incr',
    'legs/measure-lowerleg-height-decr', 'legs/measure-lowerleg-height-incr',
    'head/head-scale-vert-decr', 'head/head-scale-vert-incr',
    'breast/breast-dist-decr', 'breast/breast-dist-incr',
    'breast/breast-point-decr', 'breast/breast-point-incr',
    'breast/breast-trans-down', 'breast/breast-trans-up',
    'breast/breast-volume-vert-down', 'breast/breast-volume-vert-up',
    'torso/measure-underbust-circ-decr', 'torso/measure-underbust-circ-incr',
    'torso/measure-frontchest-dist-decr', 'torso/measure-frontchest-dist-incr',
    'torso/measure-waisttohip-dist-decr', 'torso/measure-waisttohip-dist-incr',
    'torso/torso-scale-depth-decr', 'torso/torso-scale-depth-incr',
    'torso/torso-scale-horiz-decr', 'torso/torso-scale-horiz-incr',
    'torso/torso-vshape-decr', 'torso/torso-vshape-incr',
    'torso/torso-muscle-pectoral-decr', 'torso/torso-muscle-pectoral-incr',
    'torso/torso-muscle-dorsi-decr', 'torso/torso-muscle-dorsi-incr',
    'stomach/stomach-tone-decr', 'stomach/stomach-tone-incr',
    'stomach/stomach-navel-out', 'stomach/stomach-navel-in',
    'hip/hip-scale-depth-decr', 'hip/hip-scale-depth-incr',
    'hip/hip-scale-vert-decr', 'hip/hip-scale-vert-incr',
    'hip/hip-waist-down', 'hip/hip-waist-up',
    'pelvis/pelvis-tone-decr', 'pelvis/pelvis-tone-incr',
    'legs/measure-knee-circ-decr', 'legs/measure-knee-circ-incr',
    'legs/l-upperleg-muscle-decr', 'legs/l-upperleg-muscle-incr',
    'legs/r-upperleg-muscle-decr', 'legs/r-upperleg-muscle-incr',
    'legs/l-lowerleg-muscle-decr', 'legs/l-lowerleg-muscle-incr',
    'legs/r-lowerleg-muscle-decr', 'legs/r-lowerleg-muscle-incr',
    'legs/l-leg-valgus-decr', 'legs/l-leg-valgus-incr',
    'legs/r-leg-valgus-decr', 'legs/r-leg-valgus-incr',
    'arms/l-upperarm-muscle-decr', 'arms/l-upperarm-muscle-incr',
    'arms/r-upperarm-muscle-decr', 'arms/r-upperarm-muscle-incr',
    'arms/l-lowerarm-muscle-decr', 'arms/l-lowerarm-muscle-incr',
    'arms/r-lowerarm-muscle-decr', 'arms/r-lowerarm-muscle-incr',
    'arms/l-upperarm-shoulder-muscle-decr', 'arms/l-upperarm-shoulder-muscle-incr',
    'arms/r-upperarm-shoulder-muscle-decr', 'arms/r-upperarm-shoulder-muscle-incr',
    'neck/measure-neck-height-decr', 'neck/measure-neck-height-incr',
    'neck/neck-scale-depth-decr', 'neck/neck-scale-depth-incr',
    'head/head-scale-horiz-decr', 'head/head-scale-horiz-incr',
    'head/head-scale-depth-decr', 'head/head-scale-depth-incr',
    'head/head-rectangular', 'head/head-oval',
    'cheek/l-cheek-volume-decr', 'cheek/l-cheek-volume-incr',
    'cheek/r-cheek-volume-decr', 'cheek/r-cheek-volume-incr',
    'cheek/l-cheek-bones-decr', 'cheek/l-cheek-bones-incr',
    'cheek/r-cheek-bones-decr', 'cheek/r-cheek-bones-incr',
    'chin/chin-width-decr', 'chin/chin-width-incr',
    'chin/chin-prominent-decr', 'chin/chin-prominent-incr',
  ]

  detailTargets.forEach((target) => paths.add(target))
  return [...paths]
}

function sourceInputProvenance() {
  const inputDigests = {
    'src/mpfb/data/3dobjs/base.obj': sha256File(objectPath),
    ...Object.fromEntries(targetPaths().map((id) => [
      `src/mpfb/data/targets/${id}.target.gz`,
      sha256File(path.join(targetRoot, `${id}.target.gz`)),
    ])),
  }
  return {
    algorithm: 'sha256-canonical-path-digest-v1',
    count: Object.keys(inputDigests).length,
    fingerprint: sha256(canonicalJson(inputDigests)),
  }
}

function parseTarget(targetPath, vertexCount) {
  const filePath = path.join(targetRoot, `${targetPath}.target.gz`)
  if (!fs.existsSync(filePath)) throw new Error(`Missing MPFB target: ${targetPath}`)

  const indices = []
  const deltas = []
  const text = gunzipSync(fs.readFileSync(filePath)).toString('utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [vertex, x, y, z] = trimmed.split(/\s+/)
    const index = Number(vertex)
    if (index >= vertexCount) continue
    indices.push(index)
    deltas.push(Number(x), Number(y), Number(z))
  }

  return { indices: new Uint32Array(indices), deltas: new Float32Array(deltas) }
}

function buildTargetBundle(vertexCount) {
  const targets = []
  let payloadBytes = 0

  for (const id of targetPaths()) {
    const data = parseTarget(id, vertexCount)
    const indexOffset = payloadBytes
    payloadBytes += data.indices.byteLength
    const deltaOffset = payloadBytes
    payloadBytes += data.deltas.byteLength
    targets.push({ id, count: data.indices.length, indexOffset, deltaOffset, ...data })
  }

  const metadata = {
    targets: Object.fromEntries(targets.map(({ id, count, indexOffset, deltaOffset }) => [id, { count, indexOffset, deltaOffset }])),
  }
  const metadataBuffer = Buffer.from(JSON.stringify(metadata), 'utf8')
  const metadataPadding = (4 - (metadataBuffer.length % 4)) % 4
  const headerBytes = 16
  const dataStart = headerBytes + metadataBuffer.length + metadataPadding
  const output = Buffer.alloc(dataStart + payloadBytes)

  output.write('MPFT', 0, 'ascii')
  output.writeUInt32LE(1, 4)
  output.writeUInt32LE(metadataBuffer.length, 8)
  output.writeUInt32LE(targets.length, 12)
  metadataBuffer.copy(output, headerBytes)

  for (const target of targets) {
    Buffer.from(target.indices.buffer).copy(output, dataStart + target.indexOffset)
    Buffer.from(target.deltas.buffer).copy(output, dataStart + target.deltaOffset)
  }

  fs.writeFileSync(path.join(outputRoot, 'targets.bin.gz'), gzipSync(output, { level: 9 }))
  return { targetCount: targets.length, recordCount: targets.reduce((total, target) => total + target.count, 0) }
}

const mesh = parseBodyMesh()
const targets = buildTargetBundle(mesh.fitVertexCount)
const assetDigests = {
  meshSha256: sha256File(path.join(outputRoot, 'body.mesh')),
  fitMeshSha256: sha256File(path.join(outputRoot, 'fit.mesh')),
  targetsSha256: sha256File(path.join(outputRoot, 'targets.bin.gz')),
  targetsDecodedSha256: sha256(gunzipSync(fs.readFileSync(path.join(outputRoot, 'targets.bin.gz')))),
}
const packageMetadata = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'))
const manifest = {
  formatVersion: 2,
  source: 'makehumancommunity/mpfb2',
  sourceRevision: resolveSourceRevision(),
  sourceRevisionBasis: 'build-checkout',
  sourceInputs: sourceInputProvenance(),
  license: 'CC0-1.0',
  application: {
    name: packageMetadata.name,
    version: packageMetadata.version,
  },
  measurementProtocol: {
    id: MEASUREMENT_PROTOCOL.id,
    version: MEASUREMENT_PROTOCOL.version,
    topology: MEASUREMENT_PROTOCOL.topology,
    definitionSha256: sha256(canonicalJson(MEASUREMENT_PROTOCOL)),
  },
  circumferenceCalibration: {
    id: CIRCUMFERENCE_CALIBRATION.id,
    version: CIRCUMFERENCE_CALIBRATION.version,
    topology: CIRCUMFERENCE_CALIBRATION.topology,
    definitionSha256: sha256(canonicalJson(CIRCUMFERENCE_CALIBRATION)),
  },
  assetDigests,
  assetFingerprint: sha256(canonicalJson(assetDigests)),
  mesh: '/assets/mpfb/body.mesh',
  fitMesh: '/assets/mpfb/fit.mesh',
  targets: '/assets/mpfb/targets.bin.gz',
  ...mesh,
  ...targets,
}

fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
fs.writeFileSync(
  path.join(outputRoot, 'MPFB-ASSET-NOTICE.txt'),
  `Source: https://github.com/makehumancommunity/mpfb2\nRevision: ${manifest.sourceRevision}\nBase mesh and target assets: CC0 1.0 Universal.\nGenerated by scripts/build-mpfb-assets.mjs.\n`,
)

process.stdout.write(`Built MPFB browser assets: ${mesh.vertexCount} vertices, ${mesh.triangleCount} triangles, ${targets.targetCount} targets.\n`)
