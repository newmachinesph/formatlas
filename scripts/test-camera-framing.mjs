import assert from 'node:assert/strict'
import {
  framePerspectiveBounds,
  makeFaceBounds,
  makeYRotationSafeBounds,
  normalizeModelBounds,
  unionModelBounds,
} from '../src/lib/cameraFraming.js'

const bounds = {
  min: { x: -2.35, y: 0.05, z: -0.62 },
  max: { x: 2.4, y: 6.8, z: 0.71 },
}

function assertBoxFits(frame, sourceBounds, aspect, fovDegrees, label) {
  const tangentY = Math.tan((fovDegrees * Math.PI / 180) * 0.5)
  const tangentX = tangentY * aspect
  for (const x of [sourceBounds.min.x, sourceBounds.max.x]) {
    for (const y of [sourceBounds.min.y, sourceBounds.max.y]) {
      for (const z of [sourceBounds.min.z, sourceBounds.max.z]) {
        const depth = frame.position.z - z
        assert.ok(depth > 0, `${label}: corner must be in front of camera`)
        const ndcX = Math.abs((x - frame.target.x) / (depth * tangentX))
        const ndcY = Math.abs((y - frame.target.y) / (depth * tangentY))
        assert.ok(ndcX <= 1, `${label}: horizontal corner clipped (${ndcX})`)
        assert.ok(ndcY <= 1, `${label}: vertical corner clipped (${ndcY})`)
      }
    }
  }
}

for (const aspect of [0.16, 0.32, 0.5, 1, 1.8, 3.2]) {
  for (const fov of [24, 34, 55]) {
    const frame = framePerspectiveBounds(bounds, { aspect, verticalFovDegrees: fov, margin: 1.12 })
    assert.ok(frame, `frame exists at aspect ${aspect}`)
    assertBoxFits(frame, bounds, aspect, fov, `aspect ${aspect}, fov ${fov}`)
    assert.ok(frame.near > 0 && frame.far > frame.distance, 'valid clipping planes')
  }
}

const rotationSafeBounds = makeYRotationSafeBounds(bounds)
for (const aspect of [0.16, 0.5, 1.8]) {
  const frame = framePerspectiveBounds(rotationSafeBounds, { aspect, verticalFovDegrees: 34, margin: 1.13 })
  for (const angle of [0, -Math.PI * 0.24, -Math.PI / 2, Math.PI]) {
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)
    const rotatedBounds = {
      min: { x: Infinity, y: bounds.min.y, z: Infinity },
      max: { x: -Infinity, y: bounds.max.y, z: -Infinity },
    }
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const rotatedX = x * cosine + z * sine
        const rotatedZ = -x * sine + z * cosine
        rotatedBounds.min.x = Math.min(rotatedBounds.min.x, rotatedX)
        rotatedBounds.max.x = Math.max(rotatedBounds.max.x, rotatedX)
        rotatedBounds.min.z = Math.min(rotatedBounds.min.z, rotatedZ)
        rotatedBounds.max.z = Math.max(rotatedBounds.max.z, rotatedZ)
      }
    }
    assertBoxFits(frame, rotatedBounds, aspect, 34, `rotated ${angle}, aspect ${aspect}`)
  }
}

const comparisonBounds = {
  min: { x: -2.8, y: 0.03, z: -0.75 },
  max: { x: 2.75, y: 7.95, z: 0.8 },
}
const comparisonUnion = makeYRotationSafeBounds(unionModelBounds(bounds, comparisonBounds))
assert.ok(comparisonUnion.max.y >= comparisonBounds.max.y, 'comparison height is included')
assert.ok(comparisonUnion.max.x >= Math.abs(comparisonBounds.min.x), 'comparison width is included')
assertBoxFits(
  framePerspectiveBounds(comparisonUnion, { aspect: 0.28, verticalFovDegrees: 34, margin: 1.13 }),
  comparisonUnion,
  0.28,
  34,
  'short active profile with tall comparison',
)

const faceBounds = makeFaceBounds(bounds)
assert.ok(faceBounds.min.y > bounds.min.y, 'face crop starts above the body floor')
assert.ok(
  Math.abs(faceBounds.max.y - (bounds.max.y + (bounds.max.y - bounds.min.y) * 0.0203)) < 1e-12,
  'face crop leaves a small hair margin above the body bounds',
)
assertBoxFits(
  framePerspectiveBounds(faceBounds, { aspect: 0.4, verticalFovDegrees: 34 }),
  faceBounds,
  0.4,
  34,
  'face portrait crop',
)

assert.equal(normalizeModelBounds(null), null)
assert.equal(normalizeModelBounds({ min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 1, z: 1 } }), null)
assert.equal(framePerspectiveBounds({ min: { x: 0, y: 0, z: 0 }, max: { x: Number.NaN, y: 1, z: 1 } }), null)

console.log('Camera framing: aspect/FOV, rotated views, comparison union, and invalid-bound guards passed.')
