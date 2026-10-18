import assert from 'node:assert/strict'
import {
  CONTROL_GROUPS,
  INITIAL_MEASUREMENTS,
  INITIAL_POSE,
  POSE_CONTROLS,
} from '../src/data/anatomy.js'
import {
  DEFAULT_APPEARANCE,
  HAIR_STYLES,
  HAIR_SWATCHES,
  SKIN_SWATCHES,
  SUIT_SWATCHES,
} from '../src/data/appearance.js'
import { sanitizeProfile } from '../src/lib/profile.js'
import { generateRandomProfile } from '../src/lib/profileRandomizer.js'
import { assessModelDomain } from '../src/lib/modelDomain.js'

const SAMPLE_COUNT = 12_000
const measurementControls = Object.values(CONTROL_GROUPS).flat()
const poseControls = POSE_CONTROLS
const measurementKeys = Object.keys(INITIAL_MEASUREMENTS)
const poseKeys = Object.keys(INITIAL_POSE)
const appearanceKeys = Object.keys(DEFAULT_APPEARANCE)
const hairStyles = new Set(HAIR_STYLES.map(({ id }) => id))
const hairColors = new Set(HAIR_SWATCHES.map(({ value }) => value))
const skinColors = new Set(SKIN_SWATCHES.map(({ value }) => value))
const suitColors = new Set(SUIT_SWATCHES.map(({ value }) => value))

function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = value + Math.imul(value ^ (value >>> 7), 61 | value) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function correlation(xs, ys) {
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length
  let numerator = 0
  let sumX = 0
  let sumY = 0

  for (let index = 0; index < xs.length; index += 1) {
    const x = xs[index] - meanX
    const y = ys[index] - meanY
    numerator += x * y
    sumX += x * x
    sumY += y * y
  }

  return numerator / Math.sqrt(sumX * sumY)
}

function assertExactKeys(actual, expected, label) {
  assert.deepEqual(Object.keys(actual), expected, `${label} schema changed`)
}

function assertProfile(profile, seed) {
  const { measurements, pose, appearance } = profile
  const prefix = `seed ${seed}`

  assertExactKeys(profile, ['measurements', 'pose', 'appearance'], `${prefix} profile`)
  assertExactKeys(measurements, measurementKeys, `${prefix} measurements`)
  assertExactKeys(pose, poseKeys, `${prefix} pose`)
  assertExactKeys(appearance, appearanceKeys, `${prefix} appearance`)

  assert.equal(measurements.gender, 1, `${prefix} must remain female`)
  for (const control of measurementControls) {
    const value = measurements[control.key]
    assert.ok(Number.isFinite(value), `${prefix} ${control.key} is not finite`)
    assert.ok(value >= control.min && value <= control.max, `${prefix} ${control.key} is outside its control range`)
  }
  for (const control of poseControls) {
    const value = pose[control.key]
    assert.ok(Number.isFinite(value), `${prefix} pose ${control.key} is not finite`)
    assert.ok(value >= control.min && value <= control.max, `${prefix} pose ${control.key} is outside its control range`)
  }

  assert.deepEqual(pose, INITIAL_POSE, `${prefix} pose must stay presentation-friendly`)
  assert.ok(measurements.underbust <= measurements.bust - 6, `${prefix} underbust/bust order`)
  assert.ok(measurements.waist < measurements.hips, `${prefix} waist/hip order`)
  assert.ok(measurements.highHip > measurements.waist, `${prefix} high hip must clear waist`)
  assert.ok(measurements.highHip < measurements.hips, `${prefix} high hip must precede full hip`)
  assert.ok(measurements.hips - measurements.highHip <= 18, `${prefix} high hip is implausibly distant`)
  assert.ok(measurements.upperArm > measurements.forearm, `${prefix} upper arm/forearm order`)
  assert.ok(measurements.forearm > measurements.wrist, `${prefix} forearm/wrist order`)
  assert.ok(measurements.thigh > measurements.calf, `${prefix} thigh/calf order`)
  assert.ok(measurements.calf > measurements.knee, `${prefix} calf/knee order`)
  assert.ok(measurements.frontChest < measurements.shoulders, `${prefix} chest/shoulder breadth order`)
  assert.ok(measurements.headWidth < measurements.headHeight, `${prefix} head width/height order`)

  const bmi = measurements.weight / ((measurements.height / 100) ** 2)
  const modelDomain = assessModelDomain(measurements)
  const inseamShare = measurements.inseam / measurements.height
  const headShare = measurements.headHeight / measurements.height
  const spanShare = measurements.armSpan / measurements.height
  assert.ok(bmi >= 17.7 && bmi <= 35, `${prefix} BMI ${bmi} is outside the authored population`)
  assert.equal(modelDomain.saturated, false, `${prefix} exceeds the representable mesh domain`)
  assert.ok(inseamShare >= 0.414 && inseamShare <= 0.506, `${prefix} inseam ratio ${inseamShare}`)
  assert.ok(headShare >= 0.104 && headShare <= 0.141, `${prefix} head ratio ${headShare}`)
  assert.ok(spanShare >= 0.939 && spanShare <= 1.066, `${prefix} arm-span ratio ${spanShare}`)

  assert.ok(hairStyles.has(appearance.hairStyle), `${prefix} unsupported hair style`)
  assert.ok(hairColors.has(appearance.hairColor), `${prefix} unsupported hair color`)
  assert.ok(hairColors.has(appearance.browColor), `${prefix} unsupported brow color`)
  assert.ok(skinColors.has(appearance.skinColor), `${prefix} unsupported skin color`)
  assert.ok(suitColors.has(appearance.suitColor), `${prefix} unsupported suit color`)
  assert.ok(appearance.lashIntensity >= 0 && appearance.lashIntensity <= 100, `${prefix} lash definition range`)
  assert.ok(!Object.hasOwn(appearance, 'eyeColor'), `${prefix} restored removed eye color`)

  assert.deepEqual(sanitizeProfile(profile), profile, `${prefix} is not sanitizer-stable`)
}

const deterministicA = generateRandomProfile(mulberry32(0xdecafbad))
const deterministicB = generateRandomProfile(mulberry32(0xdecafbad))
assert.deepEqual(deterministicA, deterministicB, 'seeded output must be deterministic')
assert.notDeepEqual(deterministicA, generateRandomProfile(mulberry32(0xdecafbae)), 'adjacent seeds should vary')

assert.throws(() => generateRandomProfile(null), TypeError)
assert.throws(() => generateRandomProfile(() => Number.NaN), RangeError)
assert.throws(() => generateRandomProfile(() => -0.1), RangeError)
assert.throws(() => generateRandomProfile(() => 1), RangeError)
assert.doesNotThrow(() => assertProfile(generateRandomProfile(() => 0), 'zero-boundary RNG'))
assert.doesNotThrow(() => assertProfile(generateRandomProfile(() => 0.999999999), 'upper-boundary RNG'))

const series = {
  height: [],
  inseam: [],
  armSpan: [],
  hips: [],
  thigh: [],
  bust: [],
  underbust: [],
  muscle: [],
  thighTone: [],
  bmi: [],
  waist: [],
}
const varied = new Map(measurementKeys.map((key) => [key, new Set()]))
const stylesSeen = new Set()
const skinTonesSeen = new Set()

for (let seed = 0; seed < SAMPLE_COUNT; seed += 1) {
  const profile = generateRandomProfile(mulberry32(seed))
  assertProfile(profile, seed)
  const { measurements } = profile
  const bmi = measurements.weight / ((measurements.height / 100) ** 2)

  for (const key of measurementKeys) varied.get(key).add(measurements[key])
  stylesSeen.add(profile.appearance.hairStyle)
  skinTonesSeen.add(profile.appearance.skinColor)
  for (const key of Object.keys(series)) {
    series[key].push(key === 'bmi' ? bmi : measurements[key])
  }
}

for (const [key, values] of varied) {
  if (key !== 'gender') assert.ok(values.size >= 20, `${key} has insufficient population variation (${values.size})`)
}
assert.equal(stylesSeen.size, HAIR_STYLES.length, 'not every supported hairstyle was reachable')
assert.equal(skinTonesSeen.size, SKIN_SWATCHES.length, 'not every supported skin tone was reachable')

const correlations = {
  'height/inseam': correlation(series.height, series.inseam),
  'height/armSpan': correlation(series.height, series.armSpan),
  'hips/thigh': correlation(series.hips, series.thigh),
  'bust/underbust': correlation(series.bust, series.underbust),
  'muscle/thighTone': correlation(series.muscle, series.thighTone),
  'BMI/waist': correlation(series.bmi, series.waist),
}

for (const [label, value] of Object.entries(correlations)) {
  assert.ok(value > 0.6, `${label} is insufficiently correlated (${value.toFixed(3)})`)
}

console.log(`Profile randomizer: ${SAMPLE_COUNT.toLocaleString()} seeded profiles passed schema, range, proportion, compatibility, and correlation checks`)
console.log(Object.entries(correlations).map(([label, value]) => `${label}=${value.toFixed(3)}`).join(' · '))
