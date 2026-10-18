import assert from 'node:assert/strict'
import { CAPTURE_LIMITS, captureDimensions } from '../src/lib/captureSizing.js'

const standard = captureDimensions({ width: 1600, height: 900, pixelRatio: 2, deviceMemory: 8 })
assert.ok(standard.width * standard.height <= CAPTURE_LIMITS.standardPixels)
assert.ok(standard.width <= CAPTURE_LIMITS.maximumDimension)
assert.ok(standard.height <= CAPTURE_LIMITS.maximumDimension)
assert.ok(Math.abs(standard.width / standard.height - 16 / 9) < 0.002)

const constrained = captureDimensions({ width: 2000, height: 1200, pixelRatio: 3, deviceMemory: 4 })
assert.equal(constrained.maximumPixels, CAPTURE_LIMITS.constrainedPixels)
assert.ok(constrained.width * constrained.height <= CAPTURE_LIMITS.constrainedPixels + constrained.width)
assert.ok(constrained.width < standard.width)

assert.deepEqual(captureDimensions({ width: 0, height: Number.NaN, pixelRatio: -1 }), {
  width: 1,
  height: 1,
  maximumPixels: CAPTURE_LIMITS.standardPixels,
})

const portrait = captureDimensions({ width: 390, height: 640, pixelRatio: 2, deviceMemory: 2 })
assert.ok(portrait.width * portrait.height <= CAPTURE_LIMITS.constrainedPixels)
assert.ok(Math.abs(portrait.width / portrait.height - 390 / 640) < 0.002)

process.stdout.write('Capture sizing passed: device memory, pixel budget, dimensions, aspect, and invalid inputs.\n')
