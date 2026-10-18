const targetPairs = Object.freeze({
  neck: Object.freeze({ decreasing: 'neck/measure-neck-circ-decr', increasing: 'neck/measure-neck-circ-incr' }),
  bust: Object.freeze({ decreasing: 'torso/measure-bust-circ-decr', increasing: 'torso/measure-bust-circ-incr' }),
  underbust: Object.freeze({ decreasing: 'torso/measure-underbust-circ-decr', increasing: 'torso/measure-underbust-circ-incr' }),
  waist: Object.freeze({ decreasing: 'torso/measure-waist-circ-decr', increasing: 'torso/measure-waist-circ-incr' }),
  highHip: Object.freeze({ decreasing: 'hip/hip-scale-horiz-decr', increasing: 'hip/hip-scale-horiz-incr' }),
  hips: Object.freeze({ decreasing: 'torso/measure-hips-circ-decr', increasing: 'torso/measure-hips-circ-incr' }),
  thigh: Object.freeze({ decreasing: 'legs/measure-thigh-circ-decr', increasing: 'legs/measure-thigh-circ-incr' }),
  knee: Object.freeze({ decreasing: 'legs/measure-knee-circ-decr', increasing: 'legs/measure-knee-circ-incr' }),
  calf: Object.freeze({ decreasing: 'legs/measure-calf-circ-decr', increasing: 'legs/measure-calf-circ-incr' }),
})

const keys = Object.freeze(Object.keys(targetPairs))

// Central finite differences of the authored HM08 target pairs. Rows are
// measured bands and columns are target-pair weights in `keys` order.
const jacobian = Object.freeze([
  Object.freeze([5.201, 0.004, 0, 0, 0, 0, 0, 0, 0]),
  Object.freeze([0, 14.99, 8.778, 0.781, 0.021, 0, 0, 0, 0]),
  Object.freeze([0, 1.836, 5.842, 8.593, 4.087, 0, 0, 0, 0]),
  Object.freeze([0, 0.002, 2.875, 10.304, 7.833, 0.046, 0, 0, 0]),
  Object.freeze([0, 0, 0, 0.009, 11.719, 13.757, 0, 0, 0]),
  Object.freeze([0, 0, 0, 0, 12.836, 12.322, 2.508, 0, 0]),
  Object.freeze([0, 0, 0, 0, 4.923, 4.424, 4.921, 0, 0]),
  Object.freeze([0, 0, 0, 0, 0, 0, 0.086, 4.93, 2.036]),
  Object.freeze([0, 0, 0, 0, 0, 0, 0, 3.152, 7.247]),
])

/**
 * Versioned description of the asset-specific closed-loop circumference
 * solver. This value is canonical JSON-hashed into the generated manifest.
 */
export const CIRCUMFERENCE_CALIBRATION = Object.freeze({
  id: 'form-atlas-hm08-circumference-calibration',
  version: 1,
  topology: 'makehuman-hm08',
  targetPairs,
  keys,
  jacobian,
  solver: Object.freeze({
    method: 'damped-least-squares',
    damping: 9,
    passes: 2,
    weightBounds: Object.freeze([-1, 1]),
    convergence: 'all-bands-within-tolerance',
  }),
})
