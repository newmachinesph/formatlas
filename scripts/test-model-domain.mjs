import assert from 'node:assert/strict'
import { assessModelDomain, MODEL_BMI_DOMAIN } from '../src/lib/modelDomain.js'

assert.deepEqual(MODEL_BMI_DOMAIN, { min: 15, max: 35 })

const inside = assessModelDomain({ height: 164, weight: 58 })
assert.equal(inside.status, 'within')
assert.equal(inside.saturated, false)
assert.ok(Math.abs(inside.bmi - 21.5645) < 0.001)
assert.equal(inside.effectiveBmi, inside.bmi)

const above = assessModelDomain({ height: 164, weight: 125 })
assert.equal(above.status, 'above')
assert.equal(above.saturated, true)
assert.equal(above.effectiveBmi, 35)
assert.ok(Math.abs(above.effectiveWeightKg - 94.136) < 0.001)

const below = assessModelDomain({ height: 198, weight: 40 })
assert.equal(below.status, 'below')
assert.equal(below.saturated, true)
assert.equal(below.effectiveBmi, 15)
assert.ok(Math.abs(below.effectiveWeightKg - 58.806) < 0.001)

const boundary = assessModelDomain({ height: 200, weight: 140 })
assert.equal(boundary.status, 'within')
assert.equal(boundary.saturated, false)
assert.equal(boundary.bmi, 35)

const fallback = assessModelDomain({ height: Number.NaN, weight: Number.POSITIVE_INFINITY })
assert.ok(Number.isFinite(fallback.bmi))
assert.equal(fallback.status, 'within')

process.stdout.write('Model domain passed: authored BMI limits, saturation, mass equivalents, and invalid-input fallbacks.\n')
