import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import sharp from 'sharp'
import {
  CONTROL_GROUPS,
  INITIAL_MEASUREMENTS,
  INITIAL_POSE,
} from '../src/data/anatomy.js'
import {
  DEFAULT_APPEARANCE,
  HAIR_STYLES,
  MAKEHUMAN_FACE_ASSETS,
  MAKEHUMAN_FIT_VERTEX_COUNT,
  MAKEHUMAN_HAIR_ASSETS,
  MAKEHUMAN_PROXY_FORMAT_VERSION,
} from '../src/data/appearance.js'
import { fitProxyPositions, parseMHProxy } from '../src/lib/makehumanProxy.js'
import { morphMpfb } from '../src/lib/mpfb.js'
import { sanitizeProfile } from '../src/lib/profile.js'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const publicRoot = path.join(projectRoot, 'public')
const mpfbRoot = path.join(publicRoot, 'assets', 'mpfb')
const makehumanRoot = path.join(publicRoot, 'assets', 'makehuman')

function assertFiniteArray(values, label) {
  for (let index = 0; index < values.length; index += 1) {
    assert.ok(Number.isFinite(values[index]), `${label}[${index}] must be finite`)
  }
}

function loadBodyMesh(filePath) {
  const buffer = fs.readFileSync(filePath)
  assert.equal(buffer.subarray(0, 4).toString(), 'MPFM')
  assert.equal(buffer.readUInt32LE(4), 1)
  const vertexCount = buffer.readUInt32LE(8)
  const indexCount = buffer.readUInt32LE(12)
  const positionOffset = 24
  const indexOffset = positionOffset + vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT
  assert.equal(buffer.byteLength, indexOffset + indexCount * Uint32Array.BYTES_PER_ELEMENT)

  const positions = new Float32Array(
    buffer.buffer,
    buffer.byteOffset + positionOffset,
    vertexCount * 3,
  ).slice()
  const indices = new Uint32Array(
    buffer.buffer,
    buffer.byteOffset + indexOffset,
    indexCount,
  ).slice()
  assertFiniteArray(positions, 'body positions')
  assert.ok(indices.every((index) => index < vertexCount), 'body indices must address body vertices')
  return { positions, indices, vertexCount }
}

function loadFitMesh(filePath) {
  const buffer = fs.readFileSync(filePath)
  assert.equal(buffer.subarray(0, 4).toString(), 'MPFF')
  assert.equal(buffer.readUInt32LE(4), 1)
  const vertexCount = buffer.readUInt32LE(8)
  assert.equal(buffer.byteLength, 12 + vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT)
  const positions = new Float32Array(
    buffer.buffer,
    buffer.byteOffset + 12,
    vertexCount * 3,
  ).slice()
  assertFiniteArray(positions, 'fit positions')
  return { positions, vertexCount }
}

function loadTargets(filePath, fitVertexCount, bodyVertexCount) {
  const buffer = zlib.gunzipSync(fs.readFileSync(filePath))
  assert.equal(buffer.subarray(0, 4).toString(), 'MPFT')
  assert.equal(buffer.readUInt32LE(4), 1)
  const metadataLength = buffer.readUInt32LE(8)
  const declaredTargetCount = buffer.readUInt32LE(12)
  const metadata = JSON.parse(buffer.subarray(16, 16 + metadataLength).toString('utf8'))
  const entries = Object.entries(metadata.targets)
  assert.equal(entries.length, declaredTargetCount)

  const dataStart = 16 + metadataLength + ((4 - (metadataLength % 4)) % 4)
  const targets = new Map()
  let extendedRecordCount = 0
  let populatedTargetCount = 0

  for (const [id, descriptor] of entries) {
    assert.ok(Number.isInteger(descriptor.count) && descriptor.count >= 0, `${id}: invalid target record count`)
    if (descriptor.count > 0) populatedTargetCount += 1
    const indexEnd = dataStart + descriptor.indexOffset + descriptor.count * Uint32Array.BYTES_PER_ELEMENT
    const deltaEnd = dataStart + descriptor.deltaOffset + descriptor.count * 3 * Float32Array.BYTES_PER_ELEMENT
    assert.ok(indexEnd <= buffer.byteLength, `${id}: index payload exceeds target bundle`)
    assert.ok(deltaEnd <= buffer.byteLength, `${id}: delta payload exceeds target bundle`)

    const indices = new Uint32Array(
      buffer.buffer,
      buffer.byteOffset + dataStart + descriptor.indexOffset,
      descriptor.count,
    )
    const deltas = new Float32Array(
      buffer.buffer,
      buffer.byteOffset + dataStart + descriptor.deltaOffset,
      descriptor.count * 3,
    )
    assertFiniteArray(deltas, `${id} deltas`)
    for (const index of indices) {
      assert.ok(index < fitVertexCount, `${id}: vertex ${index} exceeds fit.mesh`)
      if (index >= bodyVertexCount) extendedRecordCount += 1
    }
    targets.set(id, { indices, deltas })
  }

  assert.ok(extendedRecordCount > 0, 'target bundle must morph proxy-only fit vertices')
  assert.ok(populatedTargetCount > declaredTargetCount * 0.9, 'most authored targets must contain records')
  return { targets, declaredTargetCount, extendedRecordCount, populatedTargetCount }
}

function boundsOf(positions) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let offset = 0; offset < positions.length; offset += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[offset + axis])
      max[axis] = Math.max(max[axis], positions[offset + axis])
    }
  }
  const size = max.map((value, axis) => value - min[axis])
  const center = max.map((value, axis) => (value + min[axis]) / 2)
  return { min, max, size, center }
}

function sampledSurfaceDistance(proxyPositions, bodyPositions, maximumSamples = 192) {
  const proxyVertexCount = proxyPositions.length / 3
  const step = Math.max(1, Math.floor(proxyVertexCount / maximumSamples))
  let maximum = 0
  let total = 0
  let sampleCount = 0

  for (let proxyVertex = 0; proxyVertex < proxyVertexCount; proxyVertex += step) {
    const proxyOffset = proxyVertex * 3
    const x = proxyPositions[proxyOffset]
    const y = proxyPositions[proxyOffset + 1]
    const z = proxyPositions[proxyOffset + 2]
    let closestSquared = Infinity

    for (let bodyOffset = 0; bodyOffset < bodyPositions.length; bodyOffset += 3) {
      const dx = x - bodyPositions[bodyOffset]
      const dy = y - bodyPositions[bodyOffset + 1]
      const dz = z - bodyPositions[bodyOffset + 2]
      closestSquared = Math.min(closestSquared, dx * dx + dy * dy + dz * dz)
    }

    const distance = Math.sqrt(closestSquared)
    maximum = Math.max(maximum, distance)
    total += distance
    sampleCount += 1
  }

  return { maximum, mean: total / sampleCount }
}

function extremeMeasurements(bound) {
  const controls = new Map(
    Object.values(CONTROL_GROUPS).flat().map((control) => [control.key, control]),
  )
  const values = Object.fromEntries(Object.entries(INITIAL_MEASUREMENTS).map(([key, fallback]) => [
    key,
    controls.get(key)?.[bound] ?? fallback,
  ]))
  return sanitizeProfile({ measurements: values }).measurements
}

function localAssetPath(url) {
  return path.join(publicRoot, url.replace(/^\/+/, ''))
}

async function assertWebpAsset(url, maxDimension, { neutralLuminance = false } = {}) {
  const buffer = fs.readFileSync(localAssetPath(url))
  assert.equal(buffer.subarray(0, 4).toString(), 'RIFF', `${url}: invalid WebP RIFF signature`)
  assert.equal(buffer.subarray(8, 12).toString(), 'WEBP', `${url}: invalid WebP format signature`)
  const image = sharp(buffer)
  const metadata = await image.metadata()
  const { width, height } = metadata
  assert.equal(metadata.format, 'webp', `${url}: expected WebP texture`)
  assert.ok(width >= 64 && width <= 4096, `${url}: implausible texture width ${width}`)
  assert.ok(height >= 64 && height <= 4096, `${url}: implausible texture height ${height}`)
  assert.ok(width <= maxDimension && height <= maxDimension, `${url}: texture exceeds ${maxDimension}px budget`)
  assert.equal(metadata.hasAlpha, true, `${url}: alpha channel was not preserved`)

  if (neutralLuminance) {
    const { data, info } = await image.ensureAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
    for (let offset = 0; offset < data.length; offset += info.channels * 97) {
      assert.ok(
        Math.abs(data[offset] - data[offset + 1]) <= 1
          && Math.abs(data[offset + 1] - data[offset + 2]) <= 1,
        `${url}: hair texture retained source hue instead of neutral luminance`,
      )
    }
  }
}

const mpfbManifest = JSON.parse(fs.readFileSync(path.join(mpfbRoot, 'manifest.json'), 'utf8'))
const proxyManifest = JSON.parse(fs.readFileSync(path.join(makehumanRoot, 'manifest.json'), 'utf8'))
const body = loadBodyMesh(localAssetPath(mpfbManifest.mesh))
const fit = loadFitMesh(localAssetPath(mpfbManifest.fitMesh))
const targetBundle = loadTargets(
  localAssetPath(mpfbManifest.targets),
  fit.vertexCount,
  body.vertexCount,
)

assert.equal(mpfbManifest.vertexCount, body.vertexCount)
assert.equal(mpfbManifest.fitVertexCount, fit.vertexCount)
assert.equal(proxyManifest.fitVertexCount, MAKEHUMAN_FIT_VERTEX_COUNT)
assert.equal(fit.vertexCount, MAKEHUMAN_FIT_VERTEX_COUNT)
assert.equal(proxyManifest.proxyFormatVersion, MAKEHUMAN_PROXY_FORMAT_VERSION)
assert.equal(mpfbManifest.targetCount, targetBundle.declaredTargetCount)
assert.ok(fit.vertexCount > body.vertexCount, 'fit.mesh must retain non-body MakeHuman vertices')
assert.deepEqual(
  fit.positions.slice(0, body.positions.length),
  body.positions,
  'rendered body vertices must be the leading fit.mesh range',
)

const manifestHairIds = Object.keys(proxyManifest.hair)
assert.deepEqual(
  HAIR_STYLES.map((style) => style.id).filter((id) => id !== 'bare').sort(),
  manifestHairIds.slice().sort(),
  'runtime hair options must match the generated MakeHuman manifest',
)
assert.ok(DEFAULT_APPEARANCE.hairStyle === 'bare' || manifestHairIds.includes(DEFAULT_APPEARANCE.hairStyle))
for (const id of manifestHairIds) {
  assert.deepEqual(
    MAKEHUMAN_HAIR_ASSETS[id],
    {
      proxy: proxyManifest.hair[id].proxy,
      texture: proxyManifest.hair[id].texture,
    },
    `${id}: runtime hair asset paths differ from generated manifest`,
  )
}
assert.equal(MAKEHUMAN_FACE_ASSETS.eyes, proxyManifest.face.eyes.proxy)
assert.equal(MAKEHUMAN_FACE_ASSETS.brows, proxyManifest.face.brows.proxy)
assert.equal(MAKEHUMAN_FACE_ASSETS.lashes, proxyManifest.face.lashes.proxy)
assert.equal('materials' in proxyManifest.face.eyes, false, 'eye-color maps must stay excluded from runtime assets')
assert.equal(MAKEHUMAN_FACE_ASSETS.browTexture, proxyManifest.face.brows.texture)
assert.equal(MAKEHUMAN_FACE_ASSETS.lashTexture, proxyManifest.face.lashes.texture)
const proxyAssets = [
  ...Object.entries(proxyManifest.hair).map(([id, asset]) => ({ id: `hair:${id}`, kind: 'hair', asset })),
  ...Object.entries(proxyManifest.face).map(([id, asset]) => ({ id: `face:${id}`, kind: 'face', asset })),
].map((entry) => ({
  ...entry,
  proxy: parseMHProxy(fs.readFileSync(localAssetPath(entry.asset.proxy))),
}))

for (const asset of Object.values(proxyManifest.hair)) {
  await assertWebpAsset(asset.texture, 1024, { neutralLuminance: true })
  await assertWebpAsset(asset.thumbnail, 256)
}
for (const asset of Object.values(proxyManifest.face)) {
  if (asset.texture) await assertWebpAsset(asset.texture, 512)
  for (const texture of Object.values(asset.materials || {})) await assertWebpAsset(texture, 512)
}

assert.equal(proxyAssets.length, 8)
for (const { id, proxy, asset } of proxyAssets) {
  assert.equal(proxy.sourceCount, asset.sourceVertices, `${id}: source count differs from manifest`)
  assert.equal(proxy.renderCount, asset.renderVertices, `${id}: render count differs from manifest`)
  assert.equal(proxy.indexCount / 3, asset.triangles, `${id}: triangle count differs from manifest`)
  for (let offset = 0; offset < proxy.weights.length; offset += 3) {
    const sum = proxy.weights[offset] + proxy.weights[offset + 1] + proxy.weights[offset + 2]
    assert.ok(Math.abs(sum - 1) < 0.001, `${id}: proxy weights must sum to one`)
  }
  assert.ok(proxy.uvs.every((value) => value >= -0.001 && value <= 1.001), `${id}: UVs must remain in texture space`)
}

const assets = {
  ...body,
  fitPositions: fit.positions,
  targets: targetBundle.targets,
}
const profiles = [
  ['default', sanitizeProfile(null).measurements],
  ['all-controls-min', extremeMeasurements('min')],
  ['all-controls-max', extremeMeasurements('max')],
]
const fittedByProxy = new Map(proxyAssets.map(({ id }) => [id, []]))

for (const [profileName, measurements] of profiles) {
  const morphed = morphMpfb(assets, measurements, INITIAL_POSE)
  assert.equal(morphed.fitPositions.length, fit.positions.length, `${profileName}: fit mesh length changed`)
  assert.equal(morphed.neutralPositions.length, body.positions.length, `${profileName}: body mesh length changed`)
  assertFiniteArray(morphed.fitPositions, `${profileName} fit positions`)
  assert.deepEqual(
    morphed.fitPositions.slice(0, morphed.neutralPositions.length),
    morphed.neutralPositions,
    `${profileName}: rendered body must stay aligned with fit.mesh`,
  )

  const bodyBounds = boundsOf(morphed.neutralPositions)
  const fitBounds = boundsOf(morphed.fitPositions)
  const [bodyWidth, bodyHeight, bodyDepth] = bodyBounds.size
  assert.ok(bodyWidth > 4 && bodyWidth < 20, `${profileName}: implausible body width ${bodyWidth}`)
  assert.ok(bodyHeight > 8 && bodyHeight < 32, `${profileName}: implausible body height ${bodyHeight}`)
  assert.ok(bodyDepth > 1.5 && bodyDepth < 10, `${profileName}: implausible body depth ${bodyDepth}`)
  assert.ok(fitBounds.size[0] / bodyWidth > 0.9 && fitBounds.size[0] / bodyWidth < 1.15, `${profileName}: fit width diverged from body`)
  assert.ok(fitBounds.size[1] / bodyHeight > 0.9 && fitBounds.size[1] / bodyHeight < 1.15, `${profileName}: fit height diverged from body`)
  assert.ok(fitBounds.size[2] / bodyDepth > 0.85 && fitBounds.size[2] / bodyDepth < 1.3, `${profileName}: fit depth diverged from body`)

  for (const { id, kind, proxy } of proxyAssets) {
    const positions = fitProxyPositions(proxy, morphed.fitPositions)
    assert.equal(positions.length, proxy.renderCount * 3, `${profileName}/${id}: render position count changed`)
    assertFiniteArray(positions, `${profileName}/${id} positions`)
    const proxyBounds = boundsOf(positions)
    assert.ok(proxyBounds.size.every((size) => size > 0.005), `${profileName}/${id}: collapsed proxy bounds`)
    assert.ok(proxyBounds.size.every((size) => size < bodyHeight), `${profileName}/${id}: proxy exceeds human scale`)
    assert.ok(Math.abs(proxyBounds.center[0]) < bodyWidth * 0.08, `${profileName}/${id}: proxy is not centered on the head`)

    const centerHeight = (proxyBounds.center[1] - bodyBounds.min[1]) / bodyHeight
    const surfaceDistance = sampledSurfaceDistance(positions, morphed.neutralPositions)
    if (kind === 'face') {
      assert.ok(centerHeight > 0.82 && centerHeight < 1.02, `${profileName}/${id}: face proxy left the head region`)
      assert.ok(surfaceDistance.mean < bodyHeight * 0.02, `${profileName}/${id}: face proxy mean surface gap is too large`)
      assert.ok(surfaceDistance.maximum < bodyHeight * 0.04, `${profileName}/${id}: face proxy maximum surface gap is too large`)
    } else {
      const topGap = Math.abs(proxyBounds.max[1] - bodyBounds.max[1])
      assert.ok(centerHeight > 0.62 && centerHeight < 1.08, `${profileName}/${id}: hair proxy left the upper body`)
      assert.ok(topGap < bodyHeight * 0.12, `${profileName}/${id}: hair proxy top no longer follows the head`)
      assert.ok(surfaceDistance.mean < bodyHeight * 0.07, `${profileName}/${id}: hair proxy mean surface gap is too large`)
      assert.ok(surfaceDistance.maximum < bodyHeight * 0.14, `${profileName}/${id}: hair proxy maximum surface gap is too large`)
    }
    fittedByProxy.get(id).push(positions)
  }
}

for (const [id, fits] of fittedByProxy) {
  let maximumChange = 0
  for (let index = 0; index < fits[1].length; index += 1) {
    maximumChange = Math.max(maximumChange, Math.abs(fits[2][index] - fits[1][index]))
  }
  assert.ok(maximumChange > 0.5, `${id}: proxy did not respond to extreme body morphs`)
}

console.log(
  `Proxy integration passed: ${profiles.length} profiles, ${proxyAssets.length} real proxies, `
  + `${fit.vertexCount} fit vertices, and ${targetBundle.extendedRecordCount} proxy-only target records.`,
)
