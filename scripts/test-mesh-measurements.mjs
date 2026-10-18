import assert from 'node:assert/strict'
import {
  convexEnvelope,
  measureAnthropometry,
  polygonPerimeter2d,
  sliceMeshAtPlane,
} from '../src/lib/meshMeasurements.js'
import { MEASUREMENT_PROTOCOL } from '../src/data/measurementProtocol.js'

const EPSILON = 1e-7

function closeTo(actual, expected, tolerance = EPSILON, message = '') {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message || 'values differ'}: expected ${expected}, received ${actual}`,
  )
}

function pointClose(actual, expected, tolerance = EPSILON) {
  assert.equal(actual.length, expected.length)
  for (let index = 0; index < actual.length; index += 1) {
    closeTo(actual[index], expected[index], tolerance, `coordinate ${index}`)
  }
}

function makeTube({ radiusX, radiusZ = radiusX, minY = -1, maxY = 1, segments = 32, centerX = 0 }) {
  const positions = []
  for (const y of [minY, maxY]) {
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = segment / segments * Math.PI * 2
      positions.push(centerX + Math.cos(angle) * radiusX, y, Math.sin(angle) * radiusZ)
    }
  }
  const indices = []
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments
    const bottom = segment
    const bottomNext = next
    const top = segments + segment
    const topNext = segments + next
    indices.push(bottom, top, topNext, bottom, topNext, bottomNext)
  }
  return { positions: new Float64Array(positions), indices: new Uint32Array(indices) }
}

function makePrism(crossSection, minY = -1, maxY = 1) {
  const positions = []
  for (const y of [minY, maxY]) {
    for (const [x, z] of crossSection) positions.push(x, y, z)
  }
  const count = crossSection.length
  const indices = []
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count
    indices.push(index, count + index, count + next, index, count + next, next)
  }
  return { positions: new Float64Array(positions), indices: new Uint32Array(indices) }
}

function makeEllipsoid({ radiusX, radiusY, radiusZ, longitudeSegments = 48, latitudeSegments = 12 }) {
  assert.equal(latitudeSegments % 2, 0, 'an even latitude count puts vertices exactly on the equator')
  const positions = [0, -radiusY, 0]
  for (let latitude = 1; latitude < latitudeSegments; latitude += 1) {
    const phi = -Math.PI / 2 + Math.PI * latitude / latitudeSegments
    const ringScale = Math.cos(phi)
    for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
      const theta = longitude / longitudeSegments * Math.PI * 2
      positions.push(
        Math.cos(theta) * radiusX * ringScale,
        Math.sin(phi) * radiusY,
        Math.sin(theta) * radiusZ * ringScale,
      )
    }
  }
  const top = positions.length / 3
  positions.push(0, radiusY, 0)

  const indices = []
  const firstRing = 1
  for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
    const next = (longitude + 1) % longitudeSegments
    indices.push(0, firstRing + next, firstRing + longitude)
  }
  for (let latitude = 0; latitude < latitudeSegments - 2; latitude += 1) {
    const lower = 1 + latitude * longitudeSegments
    const upper = lower + longitudeSegments
    for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
      const next = (longitude + 1) % longitudeSegments
      indices.push(
        lower + longitude,
        upper + next,
        upper + longitude,
        lower + longitude,
        lower + next,
        upper + next,
      )
    }
  }
  const lastRing = 1 + (latitudeSegments - 2) * longitudeSegments
  for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
    const next = (longitude + 1) % longitudeSegments
    indices.push(lastRing + longitude, lastRing + next, top)
  }
  return { positions: new Float64Array(positions), indices: new Uint32Array(indices) }
}

function combineMeshes(meshes) {
  const positions = []
  const indices = []
  let vertexOffset = 0
  for (const mesh of meshes) {
    positions.push(...mesh.positions)
    for (const index of mesh.indices) indices.push(index + vertexOffset)
    vertexOffset += mesh.positions.length / 3
  }
  return { positions: new Float64Array(positions), indices: new Uint32Array(indices) }
}

function reverseTriangles(indices) {
  const reversed = []
  for (let offset = indices.length - 3; offset >= 0; offset -= 3) {
    reversed.push(indices[offset + 2], indices[offset + 1], indices[offset])
  }
  return new Uint32Array(reversed)
}

function circumferenceDefinition(key, options = {}) {
  const ratio = options.ratio ?? 0.5
  return {
    key,
    targetKey: options.targetKey || key,
    kind: 'circumference',
    envelope: 'convex-hull',
    component: options.component || 'center',
    toleranceCm: options.toleranceCm ?? 0.1,
    search: {
      minRatio: options.minRatio ?? ratio,
      maxRatio: options.maxRatio ?? ratio,
      samples: options.samples || 1,
      objective: options.objective || 'closest',
      ...(Number.isFinite(options.preferredRatio) ? { preferredRatio: options.preferredRatio } : {}),
    },
  }
}

function makeProtocol(definitions) {
  return { id: 'synthetic-surface-tape', version: 7, topology: 'synthetic', definitions }
}

function regularPolygonPerimeter(radiusX, radiusZ, segments) {
  const points = Array.from({ length: segments }, (_, index) => {
    const angle = index / segments * Math.PI * 2
    return [Math.cos(angle) * radiusX, Math.sin(angle) * radiusZ]
  })
  return polygonPerimeter2d(points)
}

const concave = [[-2, -1], [2, -1], [2, 1], [0, 0], [-2, 1]]
const concaveEnvelope = convexEnvelope(concave)
assert.deepEqual(concaveEnvelope, [[-2, -1], [2, -1], [2, 1], [-2, 1]])
closeTo(polygonPerimeter2d(concaveEnvelope), 12)

const cylinder = makeTube({ radiusX: 2, segments: 64, minY: -2, maxY: 2 })
const cylinderRawPerimeter = regularPolygonPerimeter(2, 2, 64)
const cylinderScale = 50
const cylinderTarget = cylinderRawPerimeter * cylinderScale + 0.5
const cylinderProtocol = makeProtocol([
  circumferenceDefinition('cylinder', { toleranceCm: 1 }),
])
const cylinderResult = measureAnthropometry({
  neutralPositions: cylinder.positions,
  posedPositions: cylinder.positions,
  indices: cylinder.indices,
  statureCm: 200,
  targets: { cylinder: cylinderTarget },
  protocol: cylinderProtocol,
})
closeTo(cylinderResult.values.cylinder, cylinderRawPerimeter * cylinderScale, 1e-6, 'cylinder tape')
closeTo(cylinderResult.results.cylinder.residualCm, -0.5, 1e-6, 'signed residual')
assert.equal(cylinderResult.results.cylinder.status, 'within-tolerance')
assert.equal(cylinderResult.results.cylinder.closed, true)
assert.ok(cylinderResult.results.cylinder.confidence >= 0.99)
assert.deepEqual(cylinderResult.protocol, { id: 'synthetic-surface-tape', version: 7, topology: 'synthetic' })
assert.ok(cylinderResult.ribbons.cylinder.length > 8)
pointClose(cylinderResult.ribbons.cylinder[0], cylinderResult.ribbons.cylinder.at(-1))
assert.ok(Math.max(...cylinderResult.ribbons.cylinder.flat().map(Math.abs)) < 3, 'ribbons stay in raw mesh units')

const halfScaleResult = measureAnthropometry({
  neutralPositions: cylinder.positions,
  posedPositions: cylinder.positions,
  indices: cylinder.indices,
  statureCm: 100,
  targets: { cylinder: cylinderRawPerimeter * 25 + 3 },
  protocol: cylinderProtocol,
})
closeTo(halfScaleResult.values.cylinder, cylinderResult.values.cylinder / 2, 1e-6, 'stature unit conversion')
closeTo(halfScaleResult.results.cylinder.residualCm, -3, 1e-6)
assert.equal(halfScaleResult.results.cylinder.status, 'outside-tolerance')

const ellipsoid = makeEllipsoid({ radiusX: 3, radiusY: 2, radiusZ: 1.5 })
const ellipsoidPerimeter = regularPolygonPerimeter(3, 1.5, 48)
const ellipsoidProtocol = makeProtocol([
  circumferenceDefinition('equator', {
    minRatio: 0.2,
    maxRatio: 0.8,
    samples: 7,
    objective: 'max',
    toleranceCm: 0.01,
  }),
])
const ellipsoidResult = measureAnthropometry({
  neutralPositions: ellipsoid.positions,
  posedPositions: ellipsoid.positions,
  indices: ellipsoid.indices,
  statureCm: 4,
  targets: { equator: ellipsoidPerimeter },
  protocol: ellipsoidProtocol,
})
closeTo(ellipsoidResult.values.equator, ellipsoidPerimeter, 1e-6, 'ellipsoid equator')
closeTo(ellipsoidResult.results.equator.yRatio, 0.5, 1e-12, 'maximum section ratio')
assert.equal(ellipsoidResult.results.equator.closed, true, 'a plane through a complete vertex ring remains closed')
pointClose(ellipsoidResult.ribbons.equator[0], ellipsoidResult.ribbons.equator.at(-1))

const exactPlane = sliceMeshAtPlane({
  positions: ellipsoid.positions,
  indices: ellipsoid.indices,
  planeY: 0,
  epsilon: 1e-12,
})
assert.equal(exactPlane.components.length, 1)
assert.equal(exactPlane.components[0].closed, true)
assert.equal(exactPlane.components[0].branched, false)

const disconnected = combineMeshes([
  makeTube({ radiusX: 1, centerX: -5 }),
  makeTube({ radiusX: 2, centerX: 0 }),
  makeTube({ radiusX: 1.5, centerX: 5 }),
])
const disconnectedProtocol = makeProtocol([
  circumferenceDefinition('torso', { component: 'center' }),
  circumferenceDefinition('rightLimb', { component: 'right' }),
])
const disconnectedResult = measureAnthropometry({
  neutralPositions: disconnected.positions,
  posedPositions: disconnected.positions,
  indices: disconnected.indices,
  statureCm: 2,
  targets: {
    torso: regularPolygonPerimeter(2, 2, 32),
    rightLimb: regularPolygonPerimeter(1.5, 1.5, 32),
  },
  protocol: disconnectedProtocol,
})
closeTo(disconnectedResult.values.torso, regularPolygonPerimeter(2, 2, 32), 1e-6)
closeTo(disconnectedResult.values.rightLimb, regularPolygonPerimeter(1.5, 1.5, 32), 1e-6)
assert.ok(disconnectedResult.ribbons.rightLimb.every(([x]) => x > 3.4), 'right component was selected')

const reorderedResult = measureAnthropometry({
  neutralPositions: disconnected.positions,
  posedPositions: disconnected.positions,
  indices: reverseTriangles(disconnected.indices),
  statureCm: 2,
  targets: disconnectedResult.values,
  protocol: disconnectedProtocol,
})
closeTo(reorderedResult.values.torso, disconnectedResult.values.torso, 1e-9, 'triangle order/winding invariance')
closeTo(reorderedResult.values.rightLimb, disconnectedResult.values.rightLimb, 1e-9, 'component invariance')

const concavePrism = makePrism(concave)
const concaveProtocol = makeProtocol([circumferenceDefinition('envelope')])
const concaveResult = measureAnthropometry({
  neutralPositions: concavePrism.positions,
  posedPositions: concavePrism.positions,
  indices: concavePrism.indices,
  statureCm: 2,
  targets: { envelope: 12 },
  protocol: concaveProtocol,
})
closeTo(concaveResult.values.envelope, 12, 1e-9, 'surface tape bridges cross-section concavities')
assert.equal(concaveResult.ribbons.envelope.length, 5, 'four envelope corners plus closure')

function affinePoint([x, y, z]) {
  return [x + 0.35 * y, 1.2 * y + 0.15 * z, z - 0.2 * x]
}

const posedCylinder = new Float64Array(cylinder.positions.length)
for (let offset = 0; offset < cylinder.positions.length; offset += 3) {
  const transformed = affinePoint([
    cylinder.positions[offset],
    cylinder.positions[offset + 1],
    cylinder.positions[offset + 2],
  ])
  posedCylinder.set(transformed, offset)
}
const posedResult = measureAnthropometry({
  neutralPositions: cylinder.positions,
  posedPositions: posedCylinder,
  indices: cylinder.indices,
  statureCm: 200,
  targets: { cylinder: cylinderResult.values.cylinder },
  protocol: cylinderProtocol,
})
closeTo(posedResult.values.cylinder, cylinderResult.values.cylinder, 1e-9, 'pose does not change neutral measurement')
assert.notDeepEqual(posedResult.ribbons.cylinder, cylinderResult.ribbons.cylinder)
for (let index = 0; index < cylinderResult.ribbons.cylinder.length; index += 1) {
  pointClose(posedResult.ribbons.cylinder[index], affinePoint(cylinderResult.ribbons.cylinder[index]), 1e-9)
}

const onlyRight = makeTube({ radiusX: 1, centerX: 5 })
const noCenterResult = measureAnthropometry({
  neutralPositions: onlyRight.positions,
  posedPositions: onlyRight.positions,
  indices: onlyRight.indices,
  statureCm: 2,
  targets: { missing: 10 },
  protocol: makeProtocol([circumferenceDefinition('missing', { component: 'center' })]),
})
assert.equal(noCenterResult.values.missing, null)
assert.deepEqual(noCenterResult.ribbons.missing, [])
assert.deepEqual(noCenterResult.results.missing, {
  valueCm: null,
  targetCm: 10,
  residualCm: null,
  toleranceCm: 0.1,
  status: 'unmeasurable',
  yRatio: null,
  closed: false,
  confidence: 0,
})

assert.throws(() => measureAnthropometry({
  neutralPositions: new Float64Array([0, 0]),
  indices: new Uint32Array([0, 1, 2]),
  statureCm: 100,
  targets: {},
}), /complete xyz vertices/)
assert.throws(() => measureAnthropometry({
  neutralPositions: cylinder.positions,
  indices: new Uint32Array([0, 1, 9999]),
  statureCm: 100,
  targets: {},
}), /out-of-range/)

const neckDefinition = MEASUREMENT_PROTOCOL.definitions.find(({ key }) => key === 'neck')
const hipDefinition = MEASUREMENT_PROTOCOL.definitions.find(({ key }) => key === 'hips')
assert.ok(neckDefinition.search.minRatio >= 0.84, 'neck search must stay above the shoulder slice')
assert.ok(hipDefinition.search.minRatio >= 0.47, 'hip search must stay above the crotch split')
assert.ok(hipDefinition.search.maxRatio <= 0.53, 'hip search remains in the connected seat window')

process.stdout.write('Mesh measurements passed: analytic tubes/ellipsoid, envelopes, components, topology degeneracy, pose attachment, units, targets, and status.\n')
