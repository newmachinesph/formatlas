import assert from 'node:assert/strict'
import fs from 'node:fs'
import { classifyBodyFace, classifyBodyPoint } from '../src/lib/bodyRegions.js'

const pointCases = [
  ['head', { x: 0, y: 6.2 }],
  ['neck', { x: 0.4, y: 4.9 }],
  ['arms', { x: 3.1, y: 3.1 }],
  ['legs', { x: 0.55, y: -3.2 }],
  ['pelvis', { x: 0.7, y: 0.1 }],
  ['waist', { x: 0.8, y: 1.7 }],
  ['bust', { x: 1.5, y: 3.1 }],
  ['torso', { x: 1, y: 4.2 }],
]

for (const [expected, point] of pointCases) {
  assert.equal(classifyBodyPoint(point), expected, `${JSON.stringify(point)} should classify as ${expected}`)
}

const basePositions = new Float32Array([
  0, 6.2, 0,
  0.2, 6.1, 0,
  0.4, 4.9, 0,
  3.1, 3.1, 0,
])
assert.equal(classifyBodyFace({ a: 0, b: 1, c: 2 }, basePositions), 'head')
assert.equal(classifyBodyFace({ a: 3, b: 3, c: 1 }, basePositions), 'arms')
assert.equal(classifyBodyFace({ a: 20, b: 21, c: 22 }, basePositions), null)
assert.equal(classifyBodyFace(null, basePositions), null)

const manifest = JSON.parse(fs.readFileSync('public/assets/mpfb/manifest.json', 'utf8'))
const mesh = fs.readFileSync(`public${manifest.mesh}`)
assert.equal(mesh.subarray(0, 4).toString(), 'MPFM')
const vertexCount = mesh.readUInt32LE(8)
const indexCount = mesh.readUInt32LE(12)
const positionOffset = 24
const indexOffset = positionOffset + vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT
const realPositions = new Float32Array(
  mesh.buffer,
  mesh.byteOffset + positionOffset,
  vertexCount * 3,
)
const realIndices = new Uint32Array(
  mesh.buffer,
  mesh.byteOffset + indexOffset,
  indexCount,
)
const regionCounts = new Map()
for (let offset = 0; offset < realIndices.length; offset += 3) {
  const region = classifyBodyFace({
    a: realIndices[offset],
    b: realIndices[offset + 1],
    c: realIndices[offset + 2],
  }, realPositions)
  regionCounts.set(region, (regionCounts.get(region) || 0) + 1)
}
for (const region of pointCases.map(([name]) => name)) {
  assert.ok(regionCounts.get(region) > 10, `${region} must own real body triangles`)
}

process.stdout.write('Body-region classification passed: synthetic boundaries, face majority, and all real mesh regions.\n')
