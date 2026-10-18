import assert from 'node:assert/strict'
import { INITIAL_MEASUREMENTS, INITIAL_POSE } from '../src/data/anatomy.js'
import { DEFAULT_APPEARANCE } from '../src/data/appearance.js'
import { PROFILE_VERSION, sanitizeProfile } from '../src/lib/profile.js'

assert.equal(PROFILE_VERSION, 5)

const defaults = sanitizeProfile(null)
assert.deepEqual(defaults, {
  measurements: INITIAL_MEASUREMENTS,
  pose: INITIAL_POSE,
  appearance: DEFAULT_APPEARANCE,
})
assert.notEqual(defaults.measurements, INITIAL_MEASUREMENTS)
assert.notEqual(defaults.pose, INITIAL_POSE)
assert.notEqual(defaults.appearance, DEFAULT_APPEARANCE)

const v2 = sanitizeProfile({
  version: 2,
  measurements: {
    height: 250,
    waist: 'not-a-number',
    weight: -4,
    gender: 0,
    unknownMeasurement: 999,
  },
  pose: { arms: 999, stance: null, turn: -100, unknownPose: 20 },
})
assert.equal(v2.measurements.height, 198)
assert.equal(v2.measurements.waist, INITIAL_MEASUREMENTS.waist)
assert.equal(v2.measurements.weight, 40)
assert.equal(v2.measurements.gender, INITIAL_MEASUREMENTS.gender)
assert.equal('unknownMeasurement' in v2.measurements, false)
assert.equal(v2.pose.arms, 72)
assert.equal(v2.pose.stance, INITIAL_POSE.stance)
assert.equal(v2.pose.turn, -45)
assert.equal('unknownPose' in v2.pose, false)
assert.deepEqual(v2.appearance, DEFAULT_APPEARANCE)

const v3 = sanitizeProfile({
  format: 'FORM Atlas profile',
  version: 3,
  baseAnatomy: 'female',
  measurements: { height: 171.25, calf: Number.POSITIVE_INFINITY },
  pose: { turn: 12 },
  appearance: {
    hairStyle: 'long',
    skinColor: '#F0D1BD',
    suitColor: '#28384F',
    hairColor: '#A95F3F',
    eyeColor: '#52758F',
    lipColor: '#7B344E',
    browColor: '#1B1717',
    hairVolume: 180,
    lashIntensity: -20,
    unsupported: true,
  },
  analysis: { bmi: -100 },
})
assert.equal(v3.measurements.height, 171.25)
assert.equal(v3.measurements.calf, INITIAL_MEASUREMENTS.calf)
assert.equal(v3.pose.turn, 12)
assert.equal(v3.appearance.hairStyle, 'long')
assert.equal(v3.appearance.skinColor, '#f0d1bd')
assert.equal(v3.appearance.suitColor, '#28384f')
assert.equal(v3.appearance.hairColor, '#a95f3f')
assert.equal(v3.appearance.browColor, '#1b1717')
assert.equal(v3.appearance.lashIntensity, 0)
assert.equal('lipColor' in v3.appearance, false)
assert.equal('eyeColor' in v3.appearance, false)
assert.equal('hairVolume' in v3.appearance, false)
assert.equal('unsupported' in v3.appearance, false)

const wrapped = sanitizeProfile(JSON.stringify({
  profile: {
    measurements: { inseam: 10 },
    pose: { stance: 62 },
    appearance: { hairStyle: 'not-a-style', lipColor: '#ffffff' },
  },
}))
assert.equal(wrapped.measurements.inseam, 60)
assert.equal(wrapped.pose.stance, 62)
assert.equal(wrapped.appearance.hairStyle, DEFAULT_APPEARANCE.hairStyle)
assert.equal('lipColor' in wrapped.appearance, false)

const invalidJson = sanitizeProfile('{ definitely not json')
assert.deepEqual(invalidJson, defaults)

const v5Export = {
  format: 'FORM Atlas profile',
  version: PROFILE_VERSION,
  baseAnatomy: 'female',
  measurements: { ...INITIAL_MEASUREMENTS, height: 176.4, highHip: 91.2 },
  pose: { ...INITIAL_POSE, arms: 41 },
  appearance: { ...DEFAULT_APPEARANCE, hairStyle: 'ponytail' },
  analysis: { ignored: true },
  realized: { values: { waist: 73.2 }, residuals: { waist: 3.2 } },
  measurementProtocol: { id: 'surface-circumference', version: 1, topology: 'hm08' },
  modelDomain: { saturated: false },
}
assert.deepEqual(sanitizeProfile(JSON.stringify(v5Export)), {
  measurements: v5Export.measurements,
  pose: v5Export.pose,
  appearance: v5Export.appearance,
})

const input = { measurements: { height: 180 }, appearance: { hairVolume: 77 } }
const before = structuredClone(input)
sanitizeProfile(input)
assert.deepEqual(input, before)

console.log('Profile sanitization passed: defaults, legacy migration, v5 round-trip, audit-field dropping, malformed input, and immutability.')
