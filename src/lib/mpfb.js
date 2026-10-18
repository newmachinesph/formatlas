import * as THREE from 'three'
import { measureAnthropometry } from './meshMeasurements.js'
import { MODEL_BMI_DOMAIN } from './modelDomain.js'
import { measurementInputSignature } from './morphSignature.js'
import { assetProvenanceSnapshot } from './assetProvenance.js'
import { verifyAssetIntegrity } from './assetIntegrity.js'
import { CIRCUMFERENCE_CALIBRATION } from '../data/circumferenceCalibration.js'

const clamp01 = (value) => THREE.MathUtils.clamp(value, 0, 1)

function readMagic(buffer, offset = 0) {
  return new TextDecoder().decode(new Uint8Array(buffer, offset, 4))
}

function parseMesh(buffer) {
  if (readMagic(buffer) !== 'MPFM') throw new Error('Invalid MPFB mesh asset')
  const view = new DataView(buffer)
  const version = view.getUint32(4, true)
  const vertexCount = view.getUint32(8, true)
  const indexCount = view.getUint32(12, true)
  if (version !== 1) throw new Error(`Unsupported MPFB mesh version ${version}`)

  const positionsOffset = 24
  const expectedBytes = positionsOffset
    + vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT
    + indexCount * Uint32Array.BYTES_PER_ELEMENT
  if (buffer.byteLength !== expectedBytes) throw new Error('Incomplete or malformed MPFB mesh asset')
  const positions = new Float32Array(buffer, positionsOffset, vertexCount * 3).slice()
  const indicesOffset = positionsOffset + positions.byteLength
  const indices = new Uint32Array(buffer, indicesOffset, indexCount).slice()
  if (!positions.every(Number.isFinite)) throw new Error('MPFB mesh contains a non-finite vertex')
  if (!indices.every((index) => index < vertexCount)) throw new Error('MPFB mesh contains an out-of-range index')
  return { positions, indices, vertexCount }
}

function parseFitMesh(buffer) {
  if (readMagic(buffer) !== 'MPFF') throw new Error('Invalid MPFB proxy-fit mesh asset')
  const view = new DataView(buffer)
  const version = view.getUint32(4, true)
  const vertexCount = view.getUint32(8, true)
  if (version !== 1) throw new Error(`Unsupported MPFB proxy-fit mesh version ${version}`)
  const expectedBytes = 12 + vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT
  if (buffer.byteLength !== expectedBytes) throw new Error('Incomplete MPFB proxy-fit mesh asset')
  const positions = new Float32Array(buffer, 12, vertexCount * 3).slice()
  if (!positions.every(Number.isFinite)) throw new Error('MPFB proxy-fit mesh contains a non-finite vertex')
  return positions
}

async function decompressGzip(buffer) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser does not support the gzip stream required by the MPFB model.')
  }
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).arrayBuffer()
}

async function parseTargets(compressedBuffer) {
  const buffer = readMagic(compressedBuffer) === 'MPFT'
    ? compressedBuffer
    : await decompressGzip(compressedBuffer)
  if (readMagic(buffer) !== 'MPFT') throw new Error('Invalid MPFB target asset')
  const view = new DataView(buffer)
  const version = view.getUint32(4, true)
  const metadataLength = view.getUint32(8, true)
  const declaredTargetCount = view.getUint32(12, true)
  if (version !== 1) throw new Error(`Unsupported MPFB target version ${version}`)
  if (16 + metadataLength > buffer.byteLength) throw new Error('Incomplete MPFB target metadata')

  const metadataBytes = new Uint8Array(buffer, 16, metadataLength)
  const metadata = JSON.parse(new TextDecoder().decode(metadataBytes))
  const padding = (4 - (metadataLength % 4)) % 4
  const dataStart = 16 + metadataLength + padding
  if (dataStart > buffer.byteLength) throw new Error('Incomplete MPFB target payload')
  const targets = new Map()

  const entries = Object.entries(metadata.targets || {})
  if (entries.length !== declaredTargetCount) throw new Error('MPFB target count does not match its metadata')
  for (const [id, descriptor] of entries) {
    const count = descriptor?.count
    const indexOffset = descriptor?.indexOffset
    const deltaOffset = descriptor?.deltaOffset
    const offsetsAreValid = Number.isInteger(indexOffset)
      && indexOffset >= 0
      && indexOffset % Uint32Array.BYTES_PER_ELEMENT === 0
      && Number.isInteger(deltaOffset)
      && deltaOffset >= 0
      && deltaOffset % Float32Array.BYTES_PER_ELEMENT === 0
    const indexEnd = dataStart + indexOffset + count * Uint32Array.BYTES_PER_ELEMENT
    const deltaEnd = dataStart + deltaOffset + count * 3 * Float32Array.BYTES_PER_ELEMENT
    if (!Number.isInteger(count)
      || count < 0
      || !offsetsAreValid
      || !Number.isSafeInteger(indexEnd)
      || !Number.isSafeInteger(deltaEnd)
      || indexEnd > buffer.byteLength
      || deltaEnd > buffer.byteLength) {
      throw new Error(`Malformed MPFB target payload: ${id}`)
    }
    targets.set(id, {
      indices: new Uint32Array(buffer, dataStart + indexOffset, count),
      deltas: new Float32Array(buffer, dataStart + deltaOffset, count * 3),
    })
  }

  return targets
}

function loadResource(url, responseType) {
  if (typeof XMLHttpRequest === 'undefined') {
    return fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Unable to load ${url} (${response.status})`)
      return responseType === 'arraybuffer' ? response.arrayBuffer() : response.text()
    })
  }
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('GET', url, true)
    request.responseType = responseType
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve(request.response)
      else reject(new Error(`Unable to load ${url} (${request.status})`))
    }
    request.onerror = () => reject(new Error(`Unable to load ${url}`))
    request.send()
  })
}

export async function loadMpfb(manifestUrl, { includeTargets = true } = {}) {
  const manifest = JSON.parse(await loadResource(manifestUrl, 'text'))
  if (manifest.formatVersion !== 2 || !manifest.fitMesh) {
    throw new Error('This viewer requires MPFB browser assets in format version 2')
  }
  const [meshBuffer, fitBuffer, targetBuffer] = await Promise.all([
    loadResource(manifest.mesh, 'arraybuffer'),
    loadResource(manifest.fitMesh, 'arraybuffer'),
    includeTargets ? loadResource(manifest.targets, 'arraybuffer') : null,
  ])
  await verifyAssetIntegrity(
    manifest,
    {
      mesh: meshBuffer,
      fitMesh: fitBuffer,
      ...(targetBuffer ? { targets: targetBuffer } : {}),
    },
    { requiredAssets: targetBuffer ? ['mesh', 'fitMesh', 'targets'] : ['mesh', 'fitMesh'] },
  )
  const [mesh, fitPositions, targets] = await Promise.all([
    parseMesh(meshBuffer),
    parseFitMesh(fitBuffer),
    targetBuffer ? parseTargets(targetBuffer) : null,
  ])
  if (fitPositions && fitPositions.length < mesh.positions.length) {
    throw new Error('MPFB proxy-fit mesh does not contain the rendered body vertices')
  }
  if (manifest.vertexCount !== mesh.vertexCount || manifest.fitVertexCount !== fitPositions.length / 3) {
    throw new Error('MPFB manifest vertex counts do not match the mesh assets')
  }
  if (targets && manifest.targetCount !== targets.size) throw new Error('MPFB manifest target count does not match the target asset')
  for (let index = 0; index < mesh.positions.length; index += 1) {
    if (fitPositions[index] !== mesh.positions[index]) {
      throw new Error('MPFB rendered body and proxy-fit topology are not aligned')
    }
  }
  const fitVertexCount = fitPositions.length / 3
  if (targets) {
    for (const [id, target] of targets) {
      if (!target.indices.every((index) => index < fitVertexCount) || !target.deltas.every(Number.isFinite)) {
        throw new Error(`MPFB target contains invalid deformation data: ${id}`)
      }
    }
  }
  return { ...mesh, fitPositions, targets, manifest }
}

export class MPFBLoader extends THREE.Loader {
  load(url, onLoad, _onProgress, onError) {
    loadMpfb(url).then(onLoad).catch(onError)
    return this
  }
}

// The canvas only needs immutable topology. Heavy target decompression and all
// morph/tape work live in the dedicated worker.
export class MPFBGeometryLoader extends THREE.Loader {
  load(url, onLoad, _onProgress, onError) {
    loadMpfb(url, { includeTargets: false }).then(onLoad).catch(onError)
    return this
  }
}

function triangularBasis(value, low, middle, high) {
  const normalized = clamp01(value)
  if (normalized <= 0.5) {
    return [[low, 1 - normalized * 2], [middle, normalized * 2]]
  }
  return [[middle, (1 - normalized) * 2], [high, normalized * 2 - 1]]
}

function signedAmount(value, minimum, center, maximum) {
  if (value < center) return -clamp01((center - value) / (center - minimum))
  return clamp01((value - center) / (maximum - center))
}

function rotatePointZ(positions, offset, pivotX, pivotY, angle, weight) {
  if (weight <= 0.001 || Math.abs(angle) <= 0.0001) return
  const appliedAngle = angle * weight
  const cosine = Math.cos(appliedAngle)
  const sine = Math.sin(appliedAngle)
  const x = positions[offset] - pivotX
  const y = positions[offset + 1] - pivotY
  positions[offset] = pivotX + x * cosine - y * sine
  positions[offset + 1] = pivotY + x * sine + y * cosine
}

function applySoftPose(positions, pose) {
  const armDelta = THREE.MathUtils.degToRad((pose.arms - 34) * 0.32)
  const stanceDelta = THREE.MathUtils.degToRad((pose.stance - 43) * 0.08)

  for (let offset = 0; offset < positions.length; offset += 3) {
    const x = positions[offset]
    const y = positions[offset + 1]
    const side = Math.sign(x) || 1
    const absoluteX = Math.abs(x)

    const armCenterY = 4.55 - (absoluteX - 1.45) * 0.78
    if (absoluteX > 1.35 && Math.abs(y - armCenterY) < 1.12) {
      const armWeight = THREE.MathUtils.smoothstep(absoluteX, 1.35, 2.35)
      rotatePointZ(positions, offset, side * 1.45, 4.45, side * armDelta, armWeight)
    }

    if (y < -1.35 && absoluteX > 0.08) {
      const legWeight = THREE.MathUtils.smoothstep(-y, 1.35, 3.2)
      rotatePointZ(positions, offset, side * 0.64, -1.45, side * stanceDelta, legWeight)
    }
  }
}

function boundsOf(positions) {
  let minY = Infinity
  let maxY = -Infinity
  for (let offset = 1; offset < positions.length; offset += 3) {
    minY = Math.min(minY, positions[offset])
    maxY = Math.max(maxY, positions[offset])
  }
  return { minY, maxY }
}

function sectionProfile(positions, y, tolerance, xLimit, side = 'center') {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  for (let offset = 0; offset < positions.length; offset += 3) {
    const x = positions[offset]
    const vertexY = positions[offset + 1]
    const z = positions[offset + 2]
    if (Math.abs(vertexY - y) > tolerance || Math.abs(x) > xLimit) continue
    if (side === 'right' && x < 0.05) continue
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minZ)) return null
  return {
    y,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    radiusX: Math.max(0.08, (maxX - minX) * 0.512),
    radiusZ: Math.max(0.08, (maxZ - minZ) * 0.512),
    mirrored: side === 'right',
  }
}

function faceAnchorOf(positions, bounds) {
  const span = bounds.maxY - bounds.minY
  const scale = span / 16.6589
  const at = (ratio) => bounds.minY + span * ratio
  const eyeProfile = sectionProfile(positions, at(0.9276), 0.08 * scale, 1.7 * scale)
  return eyeProfile ? {
    y: eyeProfile.y,
    eyeX: eyeProfile.radiusX * 0.35,
    frontZ: eyeProfile.centerZ + eyeProfile.radiusZ * 0.7,
  } : null
}

const CIRCUMFERENCE_TARGET_PAIRS = CIRCUMFERENCE_CALIBRATION.targetPairs
const CIRCUMFERENCE_KEYS = CIRCUMFERENCE_CALIBRATION.keys
const CIRCUMFERENCE_JACOBIAN = CIRCUMFERENCE_CALIBRATION.jacobian

function solveLinearSystem(matrix, values) {
  const size = values.length
  const rows = matrix.map((row, index) => [...row, values[index]])
  for (let column = 0; column < size; column += 1) {
    let pivot = column
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row
    }
    if (Math.abs(rows[pivot][column]) < 1e-8) return null
    if (pivot !== column) [rows[pivot], rows[column]] = [rows[column], rows[pivot]]
    const divisor = rows[column][column]
    for (let offset = column; offset <= size; offset += 1) rows[column][offset] /= divisor
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue
      const factor = rows[row][column]
      for (let offset = column; offset <= size; offset += 1) {
        rows[row][offset] -= factor * rows[column][offset]
      }
    }
  }
  return rows.map((row) => row[size])
}

function solveDampedLeastSquares(matrix, values, damping = 9) {
  const columns = matrix[0].length
  const normalMatrix = Array.from({ length: columns }, (_, row) => (
    Array.from({ length: columns }, (_, column) => (
      matrix.reduce((sum, source) => sum + source[row] * source[column], 0)
        + (row === column ? damping : 0)
    ))
  ))
  const projectedValues = Array.from({ length: columns }, (_, column) => (
    matrix.reduce((sum, row, index) => sum + row[column] * values[index], 0)
  ))
  return solveLinearSystem(normalMatrix, projectedValues)
}

function stampCalibrationOutcomes(anthropometry, calibration) {
  for (const key of CIRCUMFERENCE_KEYS) {
    const result = anthropometry.results[key]
    const entry = calibration[key]
    if (!entry || !result) continue
    result.appliedTargetWeight = entry.appliedWeight
    if (!Number.isFinite(result.residualCm)) {
      result.calibrationStatus = entry.status
      continue
    }
    entry.finalResidualCm = result.residualCm
    if (Math.abs(result.residualCm) <= result.toleranceCm) entry.status = 'within-tolerance'
    else if (Math.abs(entry.appliedWeight) >= 1 - 1e-9) entry.status = 'authored-limit'
    else entry.status = 'calibration-miss'
    result.calibrationStatus = entry.status
  }
  return anthropometry
}

export function morphMpfb(assets, measurements, pose) {
  const workingPositions = (assets.fitPositions || assets.positions).slice()
  const bodyPositionLength = assets.positions.length
  const circumferenceWeights = {}

  const addTarget = (id, weight) => {
    if (Math.abs(weight) < 0.0001) return
    const target = assets.targets.get(id)
    if (!target) return
    for (let index = 0; index < target.indices.length; index += 1) {
      const vertexOffset = target.indices[index] * 3
      const deltaOffset = index * 3
      if (vertexOffset + 2 >= workingPositions.length) continue
      workingPositions[vertexOffset] += target.deltas[deltaOffset] * weight
      workingPositions[vertexOffset + 1] += target.deltas[deltaOffset + 1] * weight
      workingPositions[vertexOffset + 2] += target.deltas[deltaOffset + 2] * weight
    }
  }

  const setCircumferenceWeight = (key, nextWeight) => {
    const calibration = CIRCUMFERENCE_TARGET_PAIRS[key]
    if (!calibration) return
    const previousWeight = circumferenceWeights[key] || 0
    if (previousWeight < 0) addTarget(calibration.decreasing, previousWeight)
    else if (previousWeight > 0) addTarget(calibration.increasing, -previousWeight)

    const boundedWeight = THREE.MathUtils.clamp(nextWeight, -1, 1)
    if (boundedWeight < 0) addTarget(calibration.decreasing, -boundedWeight)
    else if (boundedWeight > 0) addTarget(calibration.increasing, boundedWeight)
    circumferenceWeights[key] = boundedWeight
  }

  const seedCircumferenceWeight = (key, amount, strength = 1) => {
    setCircumferenceWeight(key, amount * strength)
  }

  const genderBasis = [['female', measurements.gender], ['male', 1 - measurements.gender]]
  const oldWeight = clamp01((measurements.age - 25) / 55)
  const ageBasis = [['young', 1 - oldWeight], ['old', oldWeight]]
  const muscleBasis = triangularBasis(measurements.muscle / 100, 'minmuscle', 'averagemuscle', 'maxmuscle')
  const bmi = measurements.weight / ((measurements.height / 100) ** 2)
  const weightBasis = triangularBasis(
    (bmi - MODEL_BMI_DOMAIN.min) / (MODEL_BMI_DOMAIN.max - MODEL_BMI_DOMAIN.min),
    'minweight',
    'averageweight',
    'maxweight',
  )

  for (const [gender, genderWeight] of genderBasis) {
    for (const [age, ageWeight] of ageBasis) {
      for (const [muscle, muscleWeight] of muscleBasis) {
        for (const [weight, bodyWeight] of weightBasis) {
          addTarget(
            `macrodetails/universal-${gender}-${age}-${muscle}-${weight}`,
            genderWeight * ageWeight * muscleWeight * bodyWeight,
          )
        }
      }
    }
  }

  const cupBasis = triangularBasis(measurements.bustSize / 100, 'mincup', 'averagecup', 'maxcup')
  const firmnessBasis = triangularBasis(measurements.bustFirmness / 100, 'minfirmness', 'averagefirmness', 'maxfirmness')
  for (const [age, ageWeight] of ageBasis) {
    for (const [muscle, muscleWeight] of muscleBasis) {
      for (const [weight, bodyWeight] of weightBasis) {
        for (const [cup, cupWeight] of cupBasis) {
          for (const [firmness, firmnessWeight] of firmnessBasis) {
            addTarget(
              `breast/female-${age}-${muscle}-${weight}-${cup}-${firmness}`,
              measurements.gender * ageWeight * muscleWeight * bodyWeight * cupWeight * firmnessWeight,
            )
          }
        }
      }
    }
  }

  const proportionValue = measurements.proportions / 100
  const proportionName = proportionValue < 0.5 ? 'uncommonproportions' : 'idealproportions'
  const proportionWeight = Math.abs(proportionValue - 0.5) * 2
  for (const [age, ageWeight] of ageBasis) {
    for (const [muscle, muscleWeight] of muscleBasis) {
      for (const [weight, bodyWeight] of weightBasis) {
        addTarget(
          `macrodetails/proportions/female-${age}-${muscle}-${weight}-${proportionName}`,
          measurements.gender * ageWeight * muscleWeight * bodyWeight * proportionWeight,
        )
      }
    }
  }

  const heightAmount = signedAmount(measurements.height, 142, 164, 198)
  const heightName = heightAmount < 0 ? 'minheight' : 'maxheight'
  for (const [age, ageWeight] of ageBasis) {
    for (const [muscle, muscleWeight] of muscleBasis) {
      for (const [weight, bodyWeight] of weightBasis) {
        addTarget(
          `macrodetails/height/female-${age}-${muscle}-${weight}-${heightName}`,
          measurements.gender * ageWeight * muscleWeight * bodyWeight * Math.abs(heightAmount),
        )
      }
    }
  }

  const addPair = (amount, decreasing, increasing, strength = 1) => {
    const targets = amount < 0 ? decreasing : increasing
    for (const target of Array.isArray(targets) ? targets : [targets]) {
      addTarget(target, Math.abs(amount) * strength)
    }
  }

  seedCircumferenceWeight('bust', signedAmount(measurements.bust, 70, 88, 125), 0.45)
  seedCircumferenceWeight('underbust', signedAmount(measurements.underbust, 60, 74, 110), 0.86)
  seedCircumferenceWeight('waist', signedAmount(measurements.waist, 52, 70, 116))
  const hipAmount = signedAmount(measurements.hips, 74, 98, 132)
  seedCircumferenceWeight('hips', hipAmount)
  seedCircumferenceWeight('highHip', signedAmount(measurements.highHip, 68, 88, 120), 0.72)
  addPair(signedAmount(measurements.buttockVolume, 0, 50, 100), 'buttocks/buttocks-volume-decr', 'buttocks/buttocks-volume-incr', 0.78)
  addPair(signedAmount(measurements.hipDepth, 0, 50, 100), 'hip/hip-scale-depth-decr', 'hip/hip-scale-depth-incr', 0.68)
  const hipHeightAmount = signedAmount(measurements.hipHeight, 0, 50, 100)
  addPair(hipHeightAmount, 'hip/hip-scale-vert-decr', 'hip/hip-scale-vert-incr', 0.56)
  addPair(hipHeightAmount, 'hip/hip-waist-down', 'hip/hip-waist-up', 0.36)
  addPair(signedAmount(measurements.pelvisTone, 0, 50, 100), 'pelvis/pelvis-tone-decr', 'pelvis/pelvis-tone-incr', 0.7)

  seedCircumferenceWeight('neck', signedAmount(measurements.neck, 24, 31, 47))
  addPair(signedAmount(measurements.neckHeight, 6, 9.4, 14), 'neck/measure-neck-height-decr', 'neck/measure-neck-height-incr', 0.72)
  addPair(signedAmount(measurements.neckDepth, 0, 50, 100), 'neck/neck-scale-depth-decr', 'neck/neck-scale-depth-incr', 0.62)
  addPair(signedAmount(measurements.shoulders, 30, 37, 52), 'torso/measure-shoulder-dist-decr', 'torso/measure-shoulder-dist-incr')
  addPair(signedAmount(measurements.frontChest, 27, 34, 48), 'torso/measure-frontchest-dist-decr', 'torso/measure-frontchest-dist-incr', 0.75)
  addPair(signedAmount(measurements.waistHipLength, 15, 21, 30), 'torso/measure-waisttohip-dist-decr', 'torso/measure-waisttohip-dist-incr', 0.7)
  addPair(signedAmount(measurements.torsoWidth, 0, 50, 100), 'torso/torso-scale-horiz-decr', 'torso/torso-scale-horiz-incr', 0.52)
  addPair(signedAmount(measurements.torsoDepth, 0, 50, 100), 'torso/torso-scale-depth-decr', 'torso/torso-scale-depth-incr', 0.58)
  addPair(signedAmount(measurements.vShape, 0, 50, 100), 'torso/torso-vshape-decr', 'torso/torso-vshape-incr', 0.56)
  addPair(signedAmount(measurements.stomachTone, 0, 50, 100), 'stomach/stomach-tone-decr', 'stomach/stomach-tone-incr', 0.72)
  addPair(signedAmount(measurements.navelDepth, 0, 50, 100), 'stomach/stomach-navel-out', 'stomach/stomach-navel-in', 0.55)
  const pectoralAmount = signedAmount(measurements.pectoralTone, 0, 50, 100)
  addPair(pectoralAmount, 'torso/torso-muscle-pectoral-decr', 'torso/torso-muscle-pectoral-incr', 0.48)
  addPair(pectoralAmount, 'torso/torso-muscle-dorsi-decr', 'torso/torso-muscle-dorsi-incr', 0.42)

  addPair(signedAmount(measurements.upperArm, 18, 26, 46), 'arms/measure-upperarm-circ-decr', 'arms/measure-upperarm-circ-incr')
  const forearmAmount = signedAmount(measurements.forearm, 14, 21, 36)
  addPair(forearmAmount, ['arms/l-lowerarm-scale-horiz-decr', 'arms/r-lowerarm-scale-horiz-decr'], ['arms/l-lowerarm-scale-horiz-incr', 'arms/r-lowerarm-scale-horiz-incr'], 0.7)
  addPair(forearmAmount, ['arms/l-lowerarm-scale-depth-decr', 'arms/r-lowerarm-scale-depth-decr'], ['arms/l-lowerarm-scale-depth-incr', 'arms/r-lowerarm-scale-depth-incr'], 0.7)
  addPair(signedAmount(measurements.wrist, 11, 15, 24), 'hands/measure-wrist-circ-decr', 'hands/measure-wrist-circ-incr')
  const upperArmToneAmount = signedAmount(measurements.upperArmTone, 0, 50, 100)
  addPair(upperArmToneAmount, ['arms/l-upperarm-muscle-decr', 'arms/r-upperarm-muscle-decr'], ['arms/l-upperarm-muscle-incr', 'arms/r-upperarm-muscle-incr'], 0.62)
  addPair(signedAmount(measurements.forearmTone, 0, 50, 100), ['arms/l-lowerarm-muscle-decr', 'arms/r-lowerarm-muscle-decr'], ['arms/l-lowerarm-muscle-incr', 'arms/r-lowerarm-muscle-incr'], 0.62)
  addPair(signedAmount(measurements.shoulderTone, 0, 50, 100), ['arms/l-upperarm-shoulder-muscle-decr', 'arms/r-upperarm-shoulder-muscle-decr'], ['arms/l-upperarm-shoulder-muscle-incr', 'arms/r-upperarm-shoulder-muscle-incr'], 0.58)

  seedCircumferenceWeight('thigh', signedAmount(measurements.thigh, 36, 55, 80))
  seedCircumferenceWeight('knee', signedAmount(measurements.knee, 28, 36, 48))
  seedCircumferenceWeight('calf', signedAmount(measurements.calf, 24, 36, 54))
  addPair(signedAmount(measurements.thighTone, 0, 50, 100), ['legs/l-upperleg-muscle-decr', 'legs/r-upperleg-muscle-decr'], ['legs/l-upperleg-muscle-incr', 'legs/r-upperleg-muscle-incr'], 0.62)
  addPair(signedAmount(measurements.calfTone, 0, 50, 100), ['legs/l-lowerleg-muscle-decr', 'legs/r-lowerleg-muscle-decr'], ['legs/l-lowerleg-muscle-incr', 'legs/r-lowerleg-muscle-incr'], 0.62)
  addPair(signedAmount(measurements.legAlignment, 0, 50, 100), ['legs/l-leg-valgus-decr', 'legs/r-leg-valgus-decr'], ['legs/l-leg-valgus-incr', 'legs/r-leg-valgus-incr'], 0.48)
  const inseamAmount = signedAmount(measurements.inseam, 60, 76, 98)
  addPair(inseamAmount, 'legs/measure-upperleg-height-decr', 'legs/measure-upperleg-height-incr', 0.68)
  addPair(inseamAmount, 'legs/measure-lowerleg-height-decr', 'legs/measure-lowerleg-height-incr', 0.68)
  addPair(signedAmount(measurements.headHeight, 16, 20, 25), 'head/head-scale-vert-decr', 'head/head-scale-vert-incr')
  addPair(signedAmount(measurements.headWidth, 12.5, 15, 18.5), 'head/head-scale-horiz-decr', 'head/head-scale-horiz-incr', 0.72)
  addPair(signedAmount(measurements.headDepth, 16, 19.5, 23.5), 'head/head-scale-depth-decr', 'head/head-scale-depth-incr', 0.68)
  const headShapeAmount = signedAmount(measurements.headShape, 0, 50, 100)
  addTarget(headShapeAmount < 0 ? 'head/head-rectangular' : 'head/head-oval', Math.abs(headShapeAmount) * 0.58)
  addPair(signedAmount(measurements.cheekVolume, 0, 50, 100), ['cheek/l-cheek-volume-decr', 'cheek/r-cheek-volume-decr'], ['cheek/l-cheek-volume-incr', 'cheek/r-cheek-volume-incr'], 0.58)
  addPair(signedAmount(measurements.cheekbone, 0, 50, 100), ['cheek/l-cheek-bones-decr', 'cheek/r-cheek-bones-decr'], ['cheek/l-cheek-bones-incr', 'cheek/r-cheek-bones-incr'], 0.52)
  addPair(signedAmount(measurements.chinWidth, 0, 50, 100), 'chin/chin-width-decr', 'chin/chin-width-incr', 0.58)
  addPair(signedAmount(measurements.chinProminence, 0, 50, 100), 'chin/chin-prominent-decr', 'chin/chin-prominent-incr', 0.52)

  addPair(signedAmount(measurements.torsoLength, 35, 43.5, 56), 'torso/measure-napetowaist-dist-decr', 'torso/measure-napetowaist-dist-incr')
  const armSpanAmount = signedAmount(measurements.armSpan, 135, 164, 208)
  addPair(armSpanAmount, 'arms/measure-upperarm-length-decr', 'arms/measure-upperarm-length-incr', 0.62)
  addPair(armSpanAmount, 'arms/measure-lowerarm-length-decr', 'arms/measure-lowerarm-length-incr', 0.62)
  addPair(signedAmount(measurements.bustSpacing, 0, 50, 100), 'breast/breast-dist-decr', 'breast/breast-dist-incr', measurements.gender * 0.72)
  addPair(signedAmount(measurements.bustProjection, 0, 50, 100), 'breast/breast-point-decr', 'breast/breast-point-incr', measurements.gender * 0.68)
  addPair(signedAmount(measurements.bustPosition, 0, 50, 100), 'breast/breast-trans-down', 'breast/breast-trans-up', measurements.gender * 0.62)
  addPair(signedAmount(measurements.bustFullness, 0, 50, 100), 'breast/breast-volume-vert-down', 'breast/breast-volume-vert-up', measurements.gender * 0.65)

  const measureCalibrationSurface = () => measureAnthropometry({
    neutralPositions: workingPositions.slice(0, bodyPositionLength),
    indices: assets.indices,
    statureCm: measurements.height,
    targets: measurements,
  })
  let calibrationMeasurement = measureCalibrationSurface()
  const calibrationPreliminaryValues = { ...calibrationMeasurement.values }
  const calibration = {}
  const calibrationPasses = CIRCUMFERENCE_CALIBRATION.solver.passes
  for (let pass = 0; pass < calibrationPasses; pass += 1) {
    const corrections = solveDampedLeastSquares(
      CIRCUMFERENCE_JACOBIAN,
      CIRCUMFERENCE_KEYS.map((key) => measurements[key] - calibrationMeasurement.values[key]),
      CIRCUMFERENCE_CALIBRATION.solver.damping,
    )
    for (let index = 0; index < CIRCUMFERENCE_KEYS.length; index += 1) {
      const key = CIRCUMFERENCE_KEYS[index]
      const preliminary = calibrationMeasurement.results[key]
      const targetCm = measurements[key]
      const previousWeight = circumferenceWeights[key] || 0
      if (!Number.isFinite(preliminary?.valueCm) || !Number.isFinite(targetCm) || !corrections) {
        calibration[key] = { status: 'unmeasurable', appliedWeight: previousWeight }
        continue
      }

      const requestedWeight = previousWeight + corrections[index]
      const appliedWeight = THREE.MathUtils.clamp(requestedWeight, -1, 1)
      setCircumferenceWeight(key, appliedWeight)
      calibration[key] = {
        status: appliedWeight === requestedWeight ? 'calibrated' : 'authored-limit',
        preliminaryValueCm: calibrationPreliminaryValues[key],
        requestedWeight,
        appliedWeight,
        passes: pass + 1,
      }
    }
    if (pass < calibrationPasses - 1) {
      calibrationMeasurement = measureCalibrationSurface()
      const converged = CIRCUMFERENCE_KEYS.every((key) => (
        calibrationMeasurement.results[key]?.status === 'within-tolerance'
      ))
      if (converged) break
    }
  }

  const fitPositions = workingPositions
  const neutralPositions = fitPositions.slice(0, bodyPositionLength)
  const positions = neutralPositions.slice()
  const bounds = boundsOf(neutralPositions)
  const faceAnchor = faceAnchorOf(neutralPositions, bounds)
  applySoftPose(positions, pose)
  const measuredAnthropometry = measureAnthropometry({
    neutralPositions,
    posedPositions: positions,
    indices: assets.indices,
    statureCm: measurements.height,
    targets: measurements,
  })
  const anthropometry = {
    ...measuredAnthropometry,
    inputSignature: measurementInputSignature(measurements),
    provenance: assetProvenanceSnapshot(assets.manifest),
    calibration,
    calibrationPreliminaryValues,
  }
  stampCalibrationOutcomes(anthropometry, calibration)
  return { positions, neutralPositions, fitPositions, anthropometry, faceAnchor, ...bounds }
}

/**
 * Reapply only the inexpensive soft pose to a calibrated neutral result. The
 * worker uses this when measurements are unchanged so pose sliders never rerun
 * target blending or the coupled inverse calibration.
 */
export function reposeMpfb(assets, measurements, pose, prepared) {
  const inputSignature = measurementInputSignature(measurements)
  if (!prepared?.neutralPositions
    || !prepared?.fitPositions
    || prepared.anthropometry?.inputSignature !== inputSignature) {
    throw new Error('A matching calibrated MPFB result is required for pose-only evaluation')
  }

  const neutralPositions = prepared.neutralPositions
  const positions = neutralPositions.slice()
  applySoftPose(positions, pose)
  const calibration = Object.fromEntries(
    Object.entries(prepared.anthropometry.calibration || {}).map(([key, value]) => [key, { ...value }]),
  )
  const anthropometry = {
    ...measureAnthropometry({
      neutralPositions,
      posedPositions: positions,
      indices: assets.indices,
      statureCm: measurements.height,
      targets: measurements,
    }),
    inputSignature,
    provenance: assetProvenanceSnapshot(assets.manifest),
    calibration,
    calibrationPreliminaryValues: { ...prepared.anthropometry.calibrationPreliminaryValues },
  }
  stampCalibrationOutcomes(anthropometry, calibration)
  return {
    positions,
    neutralPositions,
    fitPositions: prepared.fitPositions,
    anthropometry,
    faceAnchor: prepared.faceAnchor,
    minY: prepared.minY,
    maxY: prepared.maxY,
  }
}
