import assert from 'node:assert/strict'
import {
  fitProxyPositions,
  MHPX_HEADER_BYTES,
  parseMHProxy,
} from '../src/lib/makehumanProxy.js'

const sourceCount = 2
const renderCount = 3
const indexCount = 3

const fixtures = {
  scaleRefs: new Uint32Array([0, 1, 0, 2, 0, 3]),
  scaleDenoms: new Float32Array([2, 4, 8]),
  refs: new Uint32Array([
    0, 1, 2,
    1, 2, 3,
  ]),
  weights: new Float32Array([
    0.5, 0.25, 0.25,
    1, 0, 0,
  ]),
  offsets: new Float32Array([
    1, -1, 0.5,
    0, 2, -1,
  ]),
  renderSources: new Uint32Array([0, 1, 0]),
  uvs: new Float32Array([
    0, 0,
    1, 0,
    0, 1,
  ]),
  indices: new Uint32Array([0, 1, 2]),
}

function buildFixture(overrides = {}) {
  const data = { ...fixtures, ...overrides }
  const byteLength = MHPX_HEADER_BYTES
    + data.refs.byteLength
    + data.weights.byteLength
    + data.offsets.byteLength
    + data.renderSources.byteLength
    + data.uvs.byteLength
    + data.indices.byteLength
  const buffer = new ArrayBuffer(byteLength)
  const bytes = new Uint8Array(buffer)
  bytes.set([0x4d, 0x48, 0x50, 0x58])

  const header = new DataView(buffer)
  header.setUint32(4, 1, true)
  header.setUint32(8, sourceCount, true)
  header.setUint32(12, renderCount, true)
  header.setUint32(16, indexCount, true)
  header.setUint32(20, MHPX_HEADER_BYTES, true)
  data.scaleRefs.forEach((value, index) => header.setUint32(24 + index * 4, value, true))
  data.scaleDenoms.forEach((value, index) => header.setFloat32(48 + index * 4, value, true))
  header.setUint32(60, 0, true)

  let cursor = MHPX_HEADER_BYTES
  for (const values of [
    data.refs,
    data.weights,
    data.offsets,
    data.renderSources,
    data.uvs,
    data.indices,
  ]) {
    bytes.set(new Uint8Array(values.buffer, values.byteOffset, values.byteLength), cursor)
    cursor += values.byteLength
  }
  return buffer
}

function mutate(buffer, callback) {
  const copy = buffer.slice(0)
  callback(new DataView(copy), new Uint8Array(copy))
  return copy
}

const binary = buildFixture()
const proxy = parseMHProxy(binary)

assert.equal(proxy.version, 1)
assert.equal(proxy.sourceCount, sourceCount)
assert.equal(proxy.renderCount, renderCount)
assert.equal(proxy.indexCount, indexCount)
assert.deepEqual([...proxy.scaleRefs], [...fixtures.scaleRefs])
assert.deepEqual([...proxy.scaleDenoms], [...fixtures.scaleDenoms])
assert.deepEqual([...proxy.refs], [...fixtures.refs])
assert.deepEqual([...proxy.renderSources], [...fixtures.renderSources])
assert.deepEqual([...proxy.uvs], [...fixtures.uvs])
assert.deepEqual([...proxy.indices], [...fixtures.indices])

const fitPositions = new Float32Array([
  0, 0, 0,
  4, 2, 1,
  2, 8, 2,
  1, 3, 16,
])
assert.deepEqual(
  [...fitProxyPositions(proxy, fitPositions)],
  [
    3.5, 0.5, 1.75,
    4, 6, -1,
    3.5, 0.5, 1.75,
  ],
)

assert.throws(
  () => parseMHProxy(mutate(binary, (_view, bytes) => { bytes[0] = 0 })),
  /MHPX magic/,
)
assert.throws(
  () => parseMHProxy(mutate(binary, (view) => { view.setUint32(4, 2, true) })),
  /version 2/,
)
assert.throws(
  () => parseMHProxy(mutate(binary, (view) => { view.setUint32(20, 60, true) })),
  /header size 60/,
)
assert.throws(
  () => parseMHProxy(mutate(binary, (view) => { view.setUint32(60, 1, true) })),
  /flags/,
)
assert.throws(() => parseMHProxy(binary.slice(0, -4)), /asset length/)
assert.throws(
  () => parseMHProxy(buildFixture({ scaleDenoms: new Float32Array([2, 0, 8]) })),
  /denominator 1/,
)

const renderSourcesOffset = MHPX_HEADER_BYTES
  + fixtures.refs.byteLength
  + fixtures.weights.byteLength
  + fixtures.offsets.byteLength
assert.throws(
  () => parseMHProxy(mutate(binary, (view) => { view.setUint32(renderSourcesOffset, sourceCount, true) })),
  /renderSources/,
)

const indexOffset = renderSourcesOffset + fixtures.renderSources.byteLength + fixtures.uvs.byteLength
assert.throws(
  () => parseMHProxy(mutate(binary, (view) => { view.setUint32(indexOffset, renderCount, true) })),
  /indices/,
)

const invalidRefs = proxy.refs.slice()
invalidRefs[0] = fitPositions.length / 3
assert.throws(
  () => fitProxyPositions({ ...proxy, refs: invalidRefs }, fitPositions),
  /refs/,
)
assert.throws(() => fitProxyPositions(proxy, new Float32Array(5)), /flat xyz/)

console.log('Validated MHPX v1 parsing, proxy fitting, render expansion, and malformed input rejection.')
