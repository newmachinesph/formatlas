import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Buffer } from 'node:buffer'
import sharp from 'sharp'

const sourceRoot = process.argv[2] || process.env.MAKEHUMAN_ASSET_ROOT
if (!sourceRoot) {
  throw new Error('Pass the extracted MakeHuman system asset root: node scripts/build-makehuman-proxies.mjs C:\\path\\to\\assets')
}

const outputRoot = path.resolve('public', 'assets', 'makehuman')
const proxyRoot = path.join(outputRoot, 'proxies')
const textureRoot = path.join(outputRoot, 'textures')
const thumbnailRoot = path.join(outputRoot, 'thumbnails')

const MAKEHUMAN_FIT_VERTEX_COUNT = 19158
const MHPX_FORMAT_VERSION = 1
const HAIR_TEXTURE_MAX_SIZE = 1024
const FACE_TEXTURE_MAX_SIZE = 512
const THUMBNAIL_MAX_SIZE = 256
const HAIR_LUMINANCE_SCALE = 0.45
const HAIR_LUMINANCE_OFFSET = 140

for (const directory of [outputRoot, proxyRoot, textureRoot, thumbnailRoot]) {
  fs.mkdirSync(directory, { recursive: true })
}

const HAIR = [
  { id: 'pixie', source: 'short02', label: 'Short 02' },
  { id: 'bob', source: 'bob01', label: 'Bob 01' },
  { id: 'curls', source: 'afro01', label: 'Afro 01', texture: 'afro_diffuse.png' },
  { id: 'long', source: 'long01', label: 'Long 01' },
  { id: 'ponytail', source: 'ponytail01', label: 'Ponytail 01' },
]

const FACE_PROXIES = [
  { id: 'eyes', sourcePath: ['eyes', 'high-poly'], source: 'high-poly' },
  { id: 'brows', sourcePath: ['eyebrows', 'eyebrow001'], source: 'eyebrow001' },
  { id: 'lashes', sourcePath: ['eyelashes', 'eyelashes01'], source: 'eyelashes01' },
]

function parseIndex(value, length) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed === 0) throw new Error(`Invalid OBJ index: ${value}`)
  return parsed > 0 ? parsed - 1 : length + parsed
}

function parseObj(filePath) {
  const vertices = []
  const textureCoordinates = []
  const faces = []

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.split(/\s+/)
      vertices.push([Number(x), Number(y), Number(z)])
    } else if (line.startsWith('vt ')) {
      const [, u, v] = line.split(/\s+/)
      textureCoordinates.push([Number(u), Number(v)])
    } else if (line.startsWith('f ')) {
      const corners = line.slice(2).trim().split(/\s+/).map((token) => {
        const [vertex, uv] = token.split('/')
        return {
          vertex: parseIndex(vertex, vertices.length),
          uv: uv ? parseIndex(uv, textureCoordinates.length) : -1,
        }
      })
      if (corners.length >= 3) faces.push(corners)
    }
  }

  const renderMap = new Map()
  const renderSources = []
  const uvs = []
  const indices = []
  const renderCorner = ({ vertex, uv }) => {
    const key = `${vertex}/${uv}`
    if (!renderMap.has(key)) {
      renderMap.set(key, renderSources.length)
      renderSources.push(vertex)
      const coordinate = uv >= 0 ? textureCoordinates[uv] : [0, 0]
      uvs.push(coordinate[0], coordinate[1])
    }
    return renderMap.get(key)
  }

  for (const face of faces) {
    const first = renderCorner(face[0])
    for (let corner = 1; corner < face.length - 1; corner += 1) {
      indices.push(first, renderCorner(face[corner]), renderCorner(face[corner + 1]))
    }
  }

  if (!vertices.length || !indices.length) throw new Error(`OBJ contains no usable geometry: ${filePath}`)
  if (vertices.some((vertex) => vertex.some((value) => !Number.isFinite(value)))) {
    throw new Error(`OBJ contains a non-finite vertex: ${filePath}`)
  }
  if (uvs.some((value) => !Number.isFinite(value))) {
    throw new Error(`OBJ contains a non-finite UV: ${filePath}`)
  }
  if (indices.some((index) => index >= renderSources.length)) {
    throw new Error(`OBJ contains an out-of-range render index: ${filePath}`)
  }
  return {
    sourceCount: vertices.length,
    renderSources: new Uint32Array(renderSources),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
  }
}

function parseProxy(filePath) {
  const refs = []
  const weights = []
  const offsets = []
  const scaleRefs = new Uint32Array(6)
  const scaleDenoms = new Float32Array([1, 1, 1])
  let readingVertices = false

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const values = line.split(/\s+/)
    const key = values[0]
    const axis = key === 'x_scale' ? 0 : key === 'y_scale' ? 1 : key === 'z_scale' ? 2 : -1

    if (axis >= 0) {
      scaleRefs[axis * 2] = Number(values[1])
      scaleRefs[axis * 2 + 1] = Number(values[2])
      scaleDenoms[axis] = Number(values[3])
      continue
    }
    if (key === 'verts') {
      readingVertices = true
      continue
    }
    if (!readingVertices || !/^\d+$/.test(key)) continue

    if (values.length === 1) {
      const reference = Number(values[0])
      refs.push(reference, reference, reference)
      weights.push(1, 0, 0)
      offsets.push(0, 0, 0)
      continue
    }

    if (values.length < 6) throw new Error(`Malformed proxy vertex in ${filePath}: ${line}`)
    refs.push(Number(values[0]), Number(values[1]), Number(values[2]))
    weights.push(Number(values[3]), Number(values[4]), Number(values[5]))
    offsets.push(Number(values[6] || 0), Number(values[7] || 0), Number(values[8] || 0))
  }

  if (scaleDenoms.some((value) => !Number.isFinite(value) || value === 0)) {
    throw new Error(`Invalid proxy scale metadata: ${filePath}`)
  }
  if (scaleRefs.some((value) => value >= MAKEHUMAN_FIT_VERTEX_COUNT)) {
    throw new Error(`Proxy scale reference exceeds the ${MAKEHUMAN_FIT_VERTEX_COUNT}-vertex hm08 topology: ${filePath}`)
  }
  if (refs.some((value) => value >= MAKEHUMAN_FIT_VERTEX_COUNT)) {
    throw new Error(`Proxy reference exceeds the ${MAKEHUMAN_FIT_VERTEX_COUNT}-vertex hm08 topology: ${filePath}`)
  }
  if (weights.some((value) => !Number.isFinite(value)) || offsets.some((value) => !Number.isFinite(value))) {
    throw new Error(`Proxy contains non-finite fitting data: ${filePath}`)
  }
  for (let offset = 0; offset < weights.length; offset += 3) {
    const weightSum = weights[offset] + weights[offset + 1] + weights[offset + 2]
    if (Math.abs(weightSum - 1) > 0.001) {
      throw new Error(`Proxy weights do not sum to one at mapped vertex ${offset / 3}: ${filePath}`)
    }
  }
  return {
    refs: new Uint32Array(refs),
    weights: new Float32Array(weights),
    offsets: new Float32Array(offsets),
    scaleRefs,
    scaleDenoms,
  }
}

function writeArray(array, output, offset) {
  Buffer.from(array.buffer, array.byteOffset, array.byteLength).copy(output, offset)
  return offset + array.byteLength
}

function buildProxy(sourceDirectory, sourceName, outputName) {
  const obj = parseObj(path.join(sourceDirectory, `${sourceName}.obj`))
  const proxy = parseProxy(path.join(sourceDirectory, `${sourceName}.mhclo`))
  const mappedSourceCount = proxy.refs.length / 3
  if (mappedSourceCount !== obj.sourceCount) {
    throw new Error(`${sourceName}: OBJ has ${obj.sourceCount} vertices but proxy maps ${mappedSourceCount}`)
  }
  if (obj.renderSources.some((index) => index >= mappedSourceCount)) {
    throw new Error(`${sourceName}: render geometry references an unmapped proxy vertex`)
  }

  const headerBytes = 64
  const byteLength = headerBytes
    + proxy.refs.byteLength
    + proxy.weights.byteLength
    + proxy.offsets.byteLength
    + obj.renderSources.byteLength
    + obj.uvs.byteLength
    + obj.indices.byteLength
  const output = Buffer.alloc(byteLength)
  output.write('MHPX', 0, 'ascii')
  output.writeUInt32LE(MHPX_FORMAT_VERSION, 4)
  output.writeUInt32LE(mappedSourceCount, 8)
  output.writeUInt32LE(obj.renderSources.length, 12)
  output.writeUInt32LE(obj.indices.length, 16)
  output.writeUInt32LE(headerBytes, 20)
  for (let index = 0; index < proxy.scaleRefs.length; index += 1) output.writeUInt32LE(proxy.scaleRefs[index], 24 + index * 4)
  for (let index = 0; index < proxy.scaleDenoms.length; index += 1) output.writeFloatLE(proxy.scaleDenoms[index], 48 + index * 4)
  output.writeUInt32LE(0, 60)

  let offset = headerBytes
  offset = writeArray(proxy.refs, output, offset)
  offset = writeArray(proxy.weights, output, offset)
  offset = writeArray(proxy.offsets, output, offset)
  offset = writeArray(obj.renderSources, output, offset)
  offset = writeArray(obj.uvs, output, offset)
  offset = writeArray(obj.indices, output, offset)
  if (offset !== byteLength) throw new Error(`${sourceName}: proxy byte layout mismatch`)

  fs.writeFileSync(path.join(proxyRoot, `${outputName}.proxy`), output)
  return {
    proxy: `/assets/makehuman/proxies/${outputName}.proxy`,
    sourceVertices: mappedSourceCount,
    renderVertices: obj.renderSources.length,
    triangles: obj.indices.length / 3,
  }
}

async function writeWebpAsset(source, destination, maxSize, quality, neutralLuminance = false) {
  if (!fs.existsSync(source)) throw new Error(`Missing MakeHuman asset: ${source}`)
  const metadata = await sharp(source).metadata()
  if (!metadata.width || !metadata.height) throw new Error(`Unreadable MakeHuman image: ${source}`)
  if (!metadata.hasAlpha) throw new Error(`Expected an alpha channel in MakeHuman image: ${source}`)

  let pipeline = sharp(source)
    .resize({
      width: maxSize,
      height: maxSize,
      fit: 'inside',
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })
  if (neutralLuminance) {
    // A 55–100% neutral detail mask keeps every swatch recognizable while
    // retaining the authored strands/highlights and the untouched alpha cutout.
    pipeline = pipeline
      .greyscale()
      .linear(HAIR_LUMINANCE_SCALE, HAIR_LUMINANCE_OFFSET)
  }

  const info = await pipeline
    .webp({
      quality,
      alphaQuality: 100,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(destination)

  return {
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    width: info.width,
    height: info.height,
    bytes: info.size,
    format: 'webp',
    alpha: true,
    neutralLuminance,
    ...(neutralLuminance && {
      luminanceScale: HAIR_LUMINANCE_SCALE,
      luminanceOffset: HAIR_LUMINANCE_OFFSET,
    }),
  }
}

function removeStaleGeneratedAsset(filePath) {
  if (fs.existsSync(filePath)) fs.rmSync(filePath)
}

const manifest = {
  formatVersion: 1,
  source: 'MakeHuman system assets',
  sourceUrl: 'https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html',
  license: 'CC0 1.0 Universal',
  proxyFormatVersion: MHPX_FORMAT_VERSION,
  fitVertexCount: MAKEHUMAN_FIT_VERTEX_COUNT,
  hair: {},
  face: {},
}

for (const style of HAIR) {
  const directory = path.join(sourceRoot, 'hair', style.source)
  const textureName = style.texture || `${style.source}_diffuse.png`
  const textureOutput = `${style.id}.webp`
  const thumbnailOutput = `${style.id}.webp`
  const geometry = buildProxy(directory, style.source, `hair-${style.id}`)
  const textureInfo = await writeWebpAsset(
    path.join(directory, textureName),
    path.join(textureRoot, textureOutput),
    HAIR_TEXTURE_MAX_SIZE,
    88,
    true,
  )
  const thumbnailInfo = await writeWebpAsset(
    path.join(directory, `${style.source}.thumb`),
    path.join(thumbnailRoot, thumbnailOutput),
    THUMBNAIL_MAX_SIZE,
    82,
  )
  removeStaleGeneratedAsset(path.join(textureRoot, `${style.id}.png`))
  removeStaleGeneratedAsset(path.join(thumbnailRoot, `${style.id}.png`))
  manifest.hair[style.id] = {
    ...geometry,
    id: style.id,
    label: style.label,
    texture: `/assets/makehuman/textures/${textureOutput}`,
    thumbnail: `/assets/makehuman/thumbnails/${thumbnailOutput}`,
    textureInfo,
    thumbnailInfo,
  }
}

for (const face of FACE_PROXIES) {
  const directory = path.join(sourceRoot, ...face.sourcePath)
  manifest.face[face.id] = buildProxy(directory, face.source, face.id)
}

const browTextureInfo = await writeWebpAsset(
  path.join(sourceRoot, 'eyebrows', 'eyebrow001', 'eyebrow001.png'),
  path.join(textureRoot, 'brows.webp'),
  FACE_TEXTURE_MAX_SIZE,
  90,
)
const lashTextureInfo = await writeWebpAsset(
  path.join(sourceRoot, 'eyelashes', 'eyelashes01', 'eyelashes01.png'),
  path.join(textureRoot, 'lashes.webp'),
  FACE_TEXTURE_MAX_SIZE,
  90,
)
removeStaleGeneratedAsset(path.join(textureRoot, 'brows.png'))
removeStaleGeneratedAsset(path.join(textureRoot, 'lashes.png'))
manifest.face.brows.texture = '/assets/makehuman/textures/brows.webp'
manifest.face.brows.textureInfo = browTextureInfo
manifest.face.lashes.texture = '/assets/makehuman/textures/lashes.webp'
manifest.face.lashes.textureInfo = lashTextureInfo

// Eye-color maps are deliberately excluded. The viewer keeps the fitted eye
// geometry as a quiet, skin-matched surface instead of exposing uncanny iris
// colors. Rebuilding also clears derivatives from older asset versions.
for (const fileName of fs.readdirSync(textureRoot)) {
  if (/^eyes-[\w-]+\.(?:png|webp)$/i.test(fileName)) {
    removeStaleGeneratedAsset(path.join(textureRoot, fileName))
  }
}

fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
fs.writeFileSync(
  path.join(outputRoot, 'MAKEHUMAN-ASSET-NOTICE.txt'),
  [
    'Source: MakeHuman system assets',
    'https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html',
    'Hair, eye, eyebrow, and eyelash assets: CC0 1.0 Universal.',
    'Proxy binaries were generated by scripts/build-makehuman-proxies.mjs.',
    'Runtime WebP textures are resized derivatives of the source textures generated by the same script.',
    'Hair derivatives preserve authored luminance detail/alpha while removing source hue for truthful user-selected tinting.',
    '',
  ].join('\n'),
)

process.stdout.write(`Built ${Object.keys(manifest.hair).length} hair proxies and ${Object.keys(manifest.face).length} face proxies.\n`)
