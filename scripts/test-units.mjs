import assert from 'node:assert/strict'
import { formatHeight } from '../src/lib/units.js'

assert.equal(formatHeight(164, 'metric'), '164.0 cm')
assert.equal(formatHeight(152.4, 'imperial'), '5′ 0″')
assert.equal(formatHeight(164, 'imperial'), '5′ 5″')
assert.equal(formatHeight(182.8, 'imperial'), '6′ 0″', 'rounded inches must carry into feet')
assert.equal(formatHeight(Number.NaN, 'imperial'), '—')

process.stdout.write('Unit formatting passed: metric stature, imperial carry, and invalid values.\n')
