import {
  CONTROL_GROUPS,
  INITIAL_MEASUREMENTS,
  INITIAL_POSE,
} from '../data/anatomy.js'
import {
  DEFAULT_APPEARANCE,
  HAIR_STYLES,
  HAIR_SWATCHES,
  SKIN_SWATCHES,
  SUIT_SWATCHES,
} from '../data/appearance.js'
import { MODEL_BMI_DOMAIN } from './modelDomain.js'

const MEASUREMENT_CONTROLS = new Map(
  Object.values(CONTROL_GROUPS).flat().map((control) => [control.key, control]),
)

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function decimalPlaces(value) {
  const [, fraction = ''] = String(value).split('.')
  return fraction.length
}

function snapToControl(key, value) {
  const control = MEASUREMENT_CONTROLS.get(key)
  if (!control) return INITIAL_MEASUREMENTS[key]

  const clamped = clamp(value, control.min, control.max)
  const stepped = control.min + Math.round((clamped - control.min) / control.step) * control.step
  return Number(clamp(stepped, control.min, control.max).toFixed(decimalPlaces(control.step)))
}

function createSampler(random) {
  if (typeof random !== 'function') {
    throw new TypeError('Profile randomizer expects an RNG function')
  }

  const unit = () => {
    const value = random()
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError('Profile randomizer RNG must return a finite number in [0, 1)')
    }
    return value
  }

  const normal = () => {
    // Avoid log(0) while preserving deterministic behavior for boundary RNGs.
    const radius = Math.sqrt(-2 * Math.log(Math.max(unit(), Number.EPSILON)))
    return radius * Math.cos(2 * Math.PI * unit())
  }

  return {
    unit,
    normal,
    normalBetween(min, max) {
      return clamp(normal(), min, max)
    },
    pick(items) {
      if (!items.length) throw new RangeError('Cannot select from an empty collection')
      return items[Math.floor(unit() * items.length)]
    },
  }
}

function enforceMeasurementRelationships(values) {
  const next = { ...values, gender: 1 }

  // Circumferences should describe one coherent torso rather than independently
  // sampled rings. Keep a visible waist while still allowing straighter figures.
  next.bust = snapToControl('bust', Math.max(next.bust, next.waist + 2, next.underbust + 6))
  next.underbust = snapToControl('underbust', Math.min(next.underbust, next.bust - 6))
  next.hips = snapToControl('hips', Math.max(next.hips, next.waist + 6))

  const highHipMin = Math.max(68, next.waist + 1)
  const highHipMax = Math.min(120, next.hips - 1)
  next.highHip = snapToControl('highHip', clamp(next.highHip, highHipMin, highHipMax))

  // Segment circumferences are strictly ordered. Small explicit margins keep the
  // order intact after values are rounded to their authored UI steps.
  next.forearm = snapToControl('forearm', Math.max(next.forearm, next.wrist + 2.5))
  next.upperArm = snapToControl('upperArm', Math.max(next.upperArm, next.forearm + 2.5))
  next.knee = snapToControl('knee', next.knee)
  next.calf = snapToControl('calf', Math.max(next.calf, next.knee + 0.5))
  next.thigh = snapToControl('thigh', Math.max(next.thigh, next.calf + 8))

  // Related lengths and breadths remain within recognizably human ratios.
  next.inseam = snapToControl('inseam', clamp(next.inseam, next.height * 0.415, next.height * 0.505))
  next.armSpan = snapToControl('armSpan', clamp(next.armSpan, next.height * 0.94, next.height * 1.065))
  next.headHeight = snapToControl('headHeight', clamp(next.headHeight, next.height * 0.105, next.height * 0.14))
  next.headWidth = snapToControl('headWidth', Math.min(next.headWidth, next.headHeight - 2.8))
  next.frontChest = snapToControl('frontChest', Math.min(next.frontChest, next.shoulders - 1.5))

  return next
}

function buildMeasurements(sample) {
  const heightZ = sample.normalBetween(-2.2, 2.75)
  const frameZ = clamp(0.35 * heightZ + 0.82 * sample.normal(), -1.8, 1.8)
  const adiposityZ = sample.normalBetween(-1.55, 2.05)
  const muscleZ = clamp(0.2 * frameZ + 0.9 * sample.normal(), -1.6, 1.8)
  const curveZ = sample.normalBetween(-1.45, 1.65)
  const balanceZ = sample.normalBetween(-1.5, 1.5)
  const legZ = clamp(0.2 * heightZ + 0.9 * sample.normal(), -1.55, 1.65)

  const age = clamp(Math.round(18 + Math.pow(sample.unit(), 1.55) * 62), 18, 80)
  const height = clamp(164 + heightZ * 9.25, 142, 198)
  const ageMass = Math.max(0, age - 38) * 0.035
  // Leave a small margin below the authored macro-weight ceiling so rounding
  // the generated mass never creates a visually saturated profile.
  const bmi = clamp(
    22.1 + adiposityZ * 3.55 + Math.max(0, muscleZ) * 0.65 + ageMass,
    17.8,
    MODEL_BMI_DOMAIN.max - 0.25,
  )
  const weight = bmi * ((height / 100) ** 2)

  const waist = 0.418 * height
    + (bmi - 21.5) * 1.55
    + Math.max(0, age - 40) * 0.1
    + frameZ * 0.6
    - curveZ * 1.15
  const hips = 0.578 * height
    + (bmi - 21.5) * 1.03
    + curveZ * 3.1
    - balanceZ * 1.9
    + muscleZ * 0.8
  const underbust = 0.443 * height
    + frameZ * 1.5
    + (bmi - 21.5) * 0.58
    + balanceZ * 0.75
  const bustDifference = clamp(
    13.5 + curveZ * 2.5 + balanceZ * 3.2 + sample.normal() * 2.6,
    7,
    29,
  )
  const bust = underbust + bustDifference
  const highHip = waist + (hips - waist) * (0.64 + sample.unit() * 0.13)

  const shoulders = 0.224 * height + frameZ * 1.45 + muscleZ * 0.65 + balanceZ * 0.6
  const frontChest = shoulders - 3.1 + frameZ * 0.25 + sample.normal() * 0.45
  const inseamRatio = clamp(0.463 + legZ * 0.014 + sample.normal() * 0.003, 0.425, 0.497)
  const inseam = height * inseamRatio
  const torsoLength = height * (0.266 - legZ * 0.008) + sample.normal() * 0.65
  const armSpan = height * clamp(1 + frameZ * 0.006 + sample.normal() * 0.016, 0.95, 1.055)

  const wrist = 0.088 * height + frameZ * 0.48 + (bmi - 22) * 0.06
  const upperArm = 0.263 * underbust
    + (bmi - 21.5) * 0.52
    + muscleZ * 1.45
    + sample.normal() * 0.65
  const forearm = upperArm * 0.755 + wrist * 0.08 + muscleZ * 0.38

  const thigh = hips * 0.535 + (bmi - 21.5) * 0.28 + muscleZ * 1.15 + sample.normal() * 0.8
  const knee = 0.209 * height + frameZ * 0.5 + (bmi - 21.5) * 0.18 + sample.normal() * 0.5
  const calf = knee + 1.2 + muscleZ * 1.05 + sample.normal() * 0.6

  const headHeight = 0.1215 * height - heightZ * 0.3 + sample.normal() * 0.35
  const headWidth = headHeight * 0.735 + frameZ * 0.18 + sample.normal() * 0.2
  const headDepth = headHeight * 0.965 + frameZ * 0.18 + sample.normal() * 0.25
  const neck = 0.178 * height + frameZ * 0.9 + (bmi - 21.5) * 0.28 + muscleZ * 0.45

  const muscle = clamp(49 + muscleZ * 18 - Math.max(0, adiposityZ) * 3 + sample.normal() * 3, 8, 94)
  const tone = clamp(muscle - adiposityZ * 6 - Math.max(0, age - 42) * 0.18, 5, 95)
  const bustSize = clamp(12 + (bustDifference - 7) * 3.6 + curveZ * 3, 5, 96)
  const firmness = clamp(65 + muscleZ * 7 - (age - 25) * 0.42 - adiposityZ * 3 + sample.normal() * 5, 12, 92)
  const hipFullness = clamp(49 + curveZ * 13 - balanceZ * 7 + adiposityZ * 6 + sample.normal() * 4, 7, 94)

  const raw = {
    gender: 1,
    age,
    height,
    weight,
    muscle,
    proportions: 50 + (inseamRatio - 0.463) * 1100,
    bustSize,
    bustFirmness: firmness,
    bustSpacing: 49 + frameZ * 7 - bustSize * 0.035 + sample.normal() * 6,
    bustProjection: 25 + bustSize * 0.52 + curveZ * 3 + sample.normal() * 4,
    bustPosition: 63 - (age - 25) * 0.28 + firmness * 0.12 + sample.normal() * 4,
    bustFullness: 32 + bustSize * 0.34 + firmness * 0.2 + sample.normal() * 5,
    bust,
    underbust,
    waist,
    hips,
    highHip,
    shoulders,
    frontChest,
    torsoLength,
    waistHipLength: height * 0.127 - legZ * 0.35 + sample.normal() * 0.55,
    torsoWidth: 48 + frameZ * 12 + balanceZ * 3 + sample.normal() * 3,
    torsoDepth: 48 + adiposityZ * 12 + frameZ * 3 + sample.normal() * 3,
    vShape: 47 + muscleZ * 9 + balanceZ * 8 + frameZ * 5 + sample.normal() * 4,
    stomachTone: tone + sample.normal() * 4,
    navelDepth: 48 + adiposityZ * 6 + sample.normal() * 8,
    pectoralTone: tone + muscleZ * 4 + sample.normal() * 4,
    hipDepth: hipFullness + adiposityZ * 4 + sample.normal() * 4,
    hipHeight: 50 + legZ * 10 + sample.normal() * 6,
    buttockVolume: hipFullness + muscleZ * 4 + sample.normal() * 5,
    pelvisTone: tone + sample.normal() * 5,
    neck,
    neckHeight: 0.0565 * height + legZ * 0.15 + sample.normal() * 0.45,
    neckDepth: 46 + frameZ * 8 + adiposityZ * 7 + muscleZ * 4 + sample.normal() * 4,
    upperArm,
    forearm,
    wrist,
    armSpan,
    upperArmTone: tone + muscleZ * 5 + sample.normal() * 4,
    forearmTone: tone + muscleZ * 3 + sample.normal() * 4,
    shoulderTone: tone + muscleZ * 6 + sample.normal() * 4,
    thigh,
    knee,
    calf,
    inseam,
    thighTone: tone + muscleZ * 5 + sample.normal() * 4,
    calfTone: tone + muscleZ * 5 + sample.normal() * 4,
    legAlignment: 50 + sample.normal() * 7,
    headHeight,
    headWidth,
    headDepth,
    headShape: 53 + curveZ * 4 + sample.normal() * 8,
    cheekVolume: 48 + adiposityZ * 10 - Math.max(0, age - 45) * 0.15 + sample.normal() * 5,
    cheekbone: 51 - adiposityZ * 4 + frameZ * 3 + sample.normal() * 7,
    chinWidth: 48 + frameZ * 8 + adiposityZ * 3 + sample.normal() * 6,
    chinProminence: 50 + frameZ * 4 + sample.normal() * 8,
  }

  const snapped = Object.fromEntries(
    Object.keys(INITIAL_MEASUREMENTS).map((key) => [
      key,
      key === 'gender' ? 1 : snapToControl(key, raw[key]),
    ]),
  )

  return enforceMeasurementRelationships(snapped)
}

function buildAppearance(sample) {
  const hairStylePool = [
    ...HAIR_STYLES,
    ...HAIR_STYLES.filter((style) => style.id !== 'bare'),
    ...HAIR_STYLES.filter((style) => ['bob', 'pixie', 'long'].includes(style.id)),
  ]
  const hairColor = sample.pick(HAIR_SWATCHES).value
  const browColor = sample.unit() < 0.72
    ? hairColor
    : sample.pick(HAIR_SWATCHES.slice(0, 3)).value

  return {
    skinColor: sample.pick(SKIN_SWATCHES).value,
    suitColor: sample.pick(SUIT_SWATCHES).value,
    hairStyle: sample.pick(hairStylePool).id,
    hairColor,
    browColor,
    lashIntensity: Math.round(clamp(54 + sample.normal() * 11, 25, 82)),
  }
}

/**
 * Generate a coherent female body profile.
 *
 * `random` follows the same contract as Math.random: each call must return a
 * finite number in [0, 1). Supplying a seeded RNG makes the output deterministic.
 */
export function generateRandomProfile(random = Math.random) {
  const sample = createSampler(random)

  return {
    measurements: buildMeasurements(sample),
    pose: { ...INITIAL_POSE },
    appearance: buildAppearance(sample),
  }
}

export default generateRandomProfile
