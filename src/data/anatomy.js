import { MEASUREMENT_PROTOCOL } from './measurementProtocol.js'

export const INITIAL_MEASUREMENTS = {
  gender: 1,
  age: 29,
  height: 164,
  weight: 58,
  muscle: 48,
  proportions: 55,
  bustSize: 50,
  bustFirmness: 52,
  bustSpacing: 50,
  bustProjection: 52,
  bustPosition: 52,
  bustFullness: 50,
  bust: 88,
  underbust: 71,
  waist: 71.5,
  hips: 95.2,
  highHip: 90.4,
  shoulders: 37,
  frontChest: 34,
  torsoLength: 43.5,
  waistHipLength: 21,
  torsoWidth: 50,
  torsoDepth: 50,
  vShape: 44,
  stomachTone: 50,
  navelDepth: 50,
  pectoralTone: 48,
  hipDepth: 52,
  hipHeight: 50,
  buttockVolume: 53,
  pelvisTone: 50,
  neck: 31,
  neckHeight: 9.4,
  neckDepth: 50,
  upperArm: 26,
  forearm: 21,
  wrist: 15,
  armSpan: 164,
  upperArmTone: 48,
  forearmTone: 48,
  shoulderTone: 46,
  thigh: 56.9,
  knee: 36,
  calf: 36,
  inseam: 76,
  thighTone: 48,
  calfTone: 46,
  legAlignment: 50,
  headHeight: 20,
  headWidth: 15,
  headDepth: 19.5,
  headShape: 54,
  cheekVolume: 50,
  cheekbone: 50,
  chinWidth: 50,
  chinProminence: 50,
}

export const INITIAL_POSE = { arms: 34, stance: 43, turn: 0 }

const cm = (key, label, min, max, part, options = {}) => ({
  key,
  label,
  min,
  max,
  step: 0.1,
  unit: 'cm',
  part,
  ...options,
})

const sculpt = (key, label, part, startLabel, endLabel, options = {}) => ({
  key,
  label,
  min: 0,
  max: 100,
  step: 1,
  unit: 'sculpt',
  part,
  startLabel,
  endLabel,
  ...options,
})

const LANDMARK_UI = Object.freeze({
  neck: { region: 'head', part: 'neck', defaultForRegion: true },
  bust: { region: 'bust', part: 'bust', defaultForRegion: true },
  underbust: { region: 'bust', part: 'bust' },
  waist: { region: 'torso', part: 'waist', defaultForRegion: true },
  highHip: { region: 'pelvis', part: 'pelvis' },
  hips: { region: 'pelvis', part: 'pelvis', defaultForRegion: true },
  thigh: { region: 'legs', part: 'legs', defaultForRegion: true },
  knee: { region: 'legs', part: 'legs' },
  calf: { region: 'legs', part: 'legs' },
})

export const MEASUREMENT_LANDMARKS = Object.freeze(
  MEASUREMENT_PROTOCOL.definitions.map((definition) => Object.freeze({
    key: definition.key,
    label: definition.label,
    measurement: definition.targetKey,
    ...LANDMARK_UI[definition.key],
  })),
)

export const DEFAULT_LANDMARK_BY_REGION = Object.freeze(
  Object.fromEntries(MEASUREMENT_LANDMARKS.filter((landmark) => landmark.defaultForRegion).map((landmark) => [landmark.region, landmark.key])),
)

export const ANATOMY_REGIONS = [
  {
    id: 'foundation',
    label: 'Whole body',
    shortLabel: 'Body',
    part: 'all',
    description: 'Set the female base frame, overall mass, age characteristics, and vertical proportions.',
    accent: '#b86448',
  },
  {
    id: 'bust',
    label: 'Breast & chest',
    shortLabel: 'Bust',
    part: 'bust',
    description: 'Separate ribcage, breast volume, projection, position, spacing, and tissue firmness.',
    accent: '#b86448',
  },
  {
    id: 'torso',
    label: 'Torso & abdomen',
    shortLabel: 'Torso',
    part: 'torso',
    description: 'Shape the waist, ribcage, abdominal wall, back, and torso-to-pelvis transition.',
    accent: '#b86448',
  },
  {
    id: 'pelvis',
    label: 'Pelvis & glutes',
    shortLabel: 'Pelvis',
    part: 'pelvis',
    description: 'Control hip width and depth independently from glute volume and pelvic definition.',
    accent: '#b86448',
  },
  {
    id: 'legs',
    label: 'Legs',
    shortLabel: 'Legs',
    part: 'legs',
    description: 'Tune leg length, circumference, muscle definition, knee scale, and alignment.',
    accent: '#b86448',
  },
  {
    id: 'arms',
    label: 'Arms & shoulders',
    shortLabel: 'Arms',
    part: 'arms',
    description: 'Balance arm span, segment volume, wrists, deltoids, and upper-body definition.',
    accent: '#b86448',
  },
  {
    id: 'head',
    label: 'Head & neck',
    shortLabel: 'Head',
    part: 'head',
    description: 'Refine cranial proportions, facial structure, cheek volume, chin, and neck profile.',
    accent: '#b86448',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    shortLabel: 'Hair & color',
    part: 'appearance',
    description: 'Choose fitted MakeHuman hair and facial assets, skin tone, and studio garment color.',
    accent: '#b86448',
  },
  {
    id: 'pose',
    label: 'Pose studio',
    shortLabel: 'Pose',
    part: 'pose',
    description: 'Set a neutral presentation stance for evaluating silhouette and proportion.',
    accent: '#b86448',
  },
]

export const CONTROL_GROUPS = {
  foundation: [
    cm('height', 'Stature', 142, 198, 'all', { priority: 'primary' }),
    { key: 'weight', label: 'Body mass', min: 40, max: 125, step: 0.1, unit: 'kg', part: 'all', priority: 'primary' },
    { key: 'age', label: 'Age morphology', min: 18, max: 80, step: 1, unit: 'years', part: 'all', priority: 'primary' },
    sculpt('muscle', 'Global definition', 'all', 'Soft', 'Defined', { priority: 'primary' }),
    sculpt('proportions', 'Torso / leg balance', 'all', 'Long torso', 'Long legs', { priority: 'primary' }),
  ],
  bust: [
    cm('bust', 'Bust target', 68, 96, 'bust', { priority: 'primary', band: 'bust' }),
    cm('underbust', 'Underbust target', 60, 76, 'bust', { priority: 'primary', band: 'underbust' }),
    sculpt('bustSize', 'Breast volume', 'bust', 'Subtle', 'Full', { priority: 'primary' }),
    sculpt('bustProjection', 'Projection', 'bust', 'Shallow', 'Projected', { priority: 'primary' }),
    sculpt('bustFirmness', 'Tissue firmness', 'bust', 'Soft', 'Firm'),
    sculpt('bustSpacing', 'Breast spacing', 'bust', 'Close', 'Wide'),
    sculpt('bustPosition', 'Vertical position', 'bust', 'Lower', 'Higher'),
    sculpt('bustFullness', 'Vertical fullness', 'bust', 'Lower pole', 'Upper pole'),
  ],
  torso: [
    cm('waist', 'Natural-waist target', 58, 84, 'waist', { priority: 'primary', band: 'waist' }),
    cm('shoulders', 'Shoulder width', 30, 52, 'torso', { priority: 'primary' }),
    cm('torsoLength', 'Nape to waist', 35, 56, 'torso', { priority: 'primary' }),
    cm('frontChest', 'Front chest width', 27, 48, 'torso'),
    cm('waistHipLength', 'Waist to hip', 15, 30, 'torso'),
    sculpt('torsoWidth', 'Ribcage width', 'torso', 'Narrow', 'Broad'),
    sculpt('torsoDepth', 'Ribcage depth', 'torso', 'Shallow', 'Deep'),
    sculpt('vShape', 'Torso taper', 'torso', 'Straight', 'V-shaped'),
    sculpt('stomachTone', 'Abdominal tone', 'waist', 'Soft', 'Toned'),
    sculpt('navelDepth', 'Navel depth', 'waist', 'Shallow', 'Deep'),
    sculpt('pectoralTone', 'Chest / back tone', 'torso', 'Soft', 'Defined'),
  ],
  pelvis: [
    cm('highHip', 'High-hip target', 80, 104, 'pelvis', { priority: 'primary', band: 'highHip' }),
    cm('hips', 'Full-hip target', 82, 114, 'pelvis', { priority: 'primary', band: 'hips' }),
    sculpt('hipDepth', 'Pelvic depth', 'pelvis', 'Shallow', 'Deep', { priority: 'primary' }),
    sculpt('buttockVolume', 'Glute volume', 'pelvis', 'Subtle', 'Full', { priority: 'primary' }),
    sculpt('hipHeight', 'Hip height', 'pelvis', 'Low', 'High'),
    sculpt('pelvisTone', 'Pelvic definition', 'pelvis', 'Soft', 'Defined'),
  ],
  legs: [
    cm('inseam', 'Inseam', 60, 98, 'legs', { priority: 'primary' }),
    cm('thigh', 'Upper-thigh target', 48, 65, 'legs', { priority: 'primary', band: 'thigh' }),
    cm('knee', 'Knee target', 29, 40, 'legs', { priority: 'primary', band: 'knee' }),
    cm('calf', 'Calf target', 28, 44, 'legs', { priority: 'primary', band: 'calf' }),
    sculpt('thighTone', 'Thigh definition', 'legs', 'Soft', 'Muscular'),
    sculpt('calfTone', 'Calf definition', 'legs', 'Soft', 'Muscular'),
    sculpt('legAlignment', 'Knee alignment', 'legs', 'Varus', 'Valgus'),
  ],
  arms: [
    cm('armSpan', 'Arm span', 135, 208, 'arms', { priority: 'primary' }),
    cm('upperArm', 'Upper arm', 18, 46, 'arms', { priority: 'primary' }),
    cm('forearm', 'Forearm', 14, 36, 'arms', { priority: 'primary' }),
    cm('wrist', 'Wrist', 11, 24, 'arms', { priority: 'primary' }),
    sculpt('upperArmTone', 'Upper-arm definition', 'arms', 'Soft', 'Muscular'),
    sculpt('forearmTone', 'Forearm definition', 'arms', 'Soft', 'Muscular'),
    sculpt('shoulderTone', 'Deltoid definition', 'arms', 'Soft', 'Defined'),
  ],
  head: [
    cm('headHeight', 'Head height', 16, 25, 'head', { priority: 'primary' }),
    cm('headWidth', 'Head width', 12.5, 18.5, 'head', { priority: 'primary' }),
    cm('headDepth', 'Head depth', 16, 23.5, 'head', { priority: 'primary' }),
    cm('neck', 'Neck target', 26, 36, 'neck', { priority: 'primary', band: 'neck' }),
    cm('neckHeight', 'Neck length', 6, 14, 'neck'),
    sculpt('headShape', 'Cranial contour', 'head', 'Angular', 'Rounded'),
    sculpt('cheekVolume', 'Cheek volume', 'head', 'Lean', 'Full'),
    sculpt('cheekbone', 'Cheekbone structure', 'head', 'Soft', 'Prominent'),
    sculpt('chinWidth', 'Chin width', 'head', 'Narrow', 'Broad'),
    sculpt('chinProminence', 'Chin projection', 'head', 'Recessed', 'Prominent'),
    sculpt('neckDepth', 'Neck depth', 'neck', 'Slender', 'Deep'),
  ],
}

export const POSE_CONTROLS = [
  { key: 'arms', label: 'Arm abduction', min: 8, max: 72, step: 1, unit: 'degrees' },
  { key: 'stance', label: 'Stance width', min: 20, max: 80, step: 1, unit: 'percent' },
  { key: 'turn', label: 'Fine body turn', min: -45, max: 45, step: 1, unit: 'degrees' },
]

export const PRESETS = [
  {
    id: 'petite',
    name: 'Petite frame',
    caption: 'Compact vertical proportions',
    changes: { height: 153, weight: 47, neck: 31, bust: 82.9, underbust: 69, waist: 68.2, hips: 83.2, highHip: 82.8, shoulders: 34, thigh: 50.5, knee: 36, calf: 37.1, inseam: 69, headHeight: 19 },
  },
  {
    id: 'balanced',
    name: 'Balanced',
    caption: 'Neutral female baseline',
    changes: INITIAL_MEASUREMENTS,
  },
  {
    id: 'athletic',
    name: 'Athletic',
    caption: 'Defined upper and lower body',
    changes: { height: 169, weight: 62, muscle: 78, neck: 31, bust: 85.6, underbust: 68.1, waist: 69, hips: 94, highHip: 89.7, shoulders: 40, upperArm: 29, thigh: 57, knee: 36, calf: 38, thighTone: 76, calfTone: 72, shoulderTone: 76, buttockVolume: 48 },
  },
  {
    id: 'curved',
    name: 'Curved',
    caption: 'Pronounced bust and hip balance',
    changes: { height: 164, weight: 68, neck: 31, bust: 96, underbust: 74.9, waist: 76.9, hips: 107.1, highHip: 101.9, bustSize: 68, buttockVolume: 68, hipDepth: 64, thigh: 64.4, knee: 36, calf: 36 },
  },
  {
    id: 'tall',
    name: 'Tall frame',
    caption: 'Long limbs and lifted line',
    changes: { height: 179, weight: 66, proportions: 72, inseam: 86, torsoLength: 45, armSpan: 181, neck: 31, bust: 80.2, underbust: 60.3, waist: 72, hips: 94.3, highHip: 91.4, thigh: 56.8, knee: 36, calf: 36, shoulders: 39 },
  },
]

export function deriveProfile(measurements) {
  const bmi = measurements.weight / ((measurements.height / 100) ** 2)
  const waistHip = measurements.waist / measurements.hips
  const waistHeight = measurements.waist / measurements.height
  const bustWaist = measurements.bust - measurements.waist
  const hipWaist = measurements.hips - measurements.waist
  const legShare = measurements.inseam / measurements.height
  const upperLower = measurements.bust / measurements.hips
  const bodyFatEstimate = Math.max(12, Math.min(48, 1.2 * bmi + 0.23 * measurements.age - 5.4))

  let shape = 'Balanced'
  if (Math.abs(measurements.bust - measurements.hips) <= 5 && Math.min(bustWaist, hipWaist) >= 22) shape = 'Hourglass'
  else if (measurements.hips - measurements.bust > 7) shape = 'Pear'
  else if (measurements.bust - measurements.hips > 7) shape = 'Inverted triangle'
  else if (Math.min(bustWaist, hipWaist) < 16) shape = 'Straight'

  const frame = measurements.shoulders < 35 ? 'Narrow' : measurements.shoulders > 40 ? 'Broad' : 'Medium'

  return {
    bmi,
    waistHip,
    waistHeight,
    bustWaist,
    hipWaist,
    legShare,
    upperLower,
    bodyFatEstimate,
    shape,
    frame,
  }
}

export function findRegion(id) {
  return ANATOMY_REGIONS.find((region) => region.id === id) || ANATOMY_REGIONS[0]
}
