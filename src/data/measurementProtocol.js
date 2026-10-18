const defineCircumference = (
  key,
  label,
  {
    minRatio,
    maxRatio,
    samples,
    objective,
    component,
    toleranceCm,
    preferredRatio,
  },
) => Object.freeze({
  key,
  label,
  targetKey: key,
  kind: 'circumference',
  envelope: 'convex-hull',
  component,
  toleranceCm,
  search: Object.freeze({
    minRatio,
    maxRatio,
    samples,
    objective,
    ...(Number.isFinite(preferredRatio) ? { preferredRatio } : {}),
  }),
})

/**
 * FORM Atlas surface-tape protocol for the fixed MakeHuman HM08 topology.
 *
 * These are rendering/geometry rules, not a claim of ISO or clinical
 * anthropometry. Ratios are measured from the neutral mesh floor to crown.
 * Extremum searches make the tape follow the local silhouette instead of a
 * single fragile height sample. Neck and full-hip windows deliberately avoid
 * the former shoulder (.7874) and below-crotch (.4513) slices.
 */
export const MEASUREMENT_PROTOCOL = Object.freeze({
  id: 'form-atlas-surface-tape',
  version: 1,
  topology: 'makehuman-hm08',
  definitions: Object.freeze([
    defineCircumference('neck', 'Neck', {
      minRatio: 0.84,
      maxRatio: 0.865,
      samples: 11,
      objective: 'min',
      component: 'center',
      toleranceCm: 0.8,
    }),
    defineCircumference('bust', 'Bust', {
      minRatio: 0.665,
      maxRatio: 0.715,
      samples: 15,
      objective: 'max',
      component: 'center',
      toleranceCm: 1.2,
    }),
    defineCircumference('underbust', 'Underbust', {
      minRatio: 0.625,
      maxRatio: 0.66,
      samples: 13,
      objective: 'min',
      component: 'center',
      toleranceCm: 1,
    }),
    defineCircumference('waist', 'Natural waist', {
      minRatio: 0.57,
      maxRatio: 0.615,
      samples: 15,
      objective: 'min',
      component: 'center',
      toleranceCm: 1,
    }),
    defineCircumference('highHip', 'High hip', {
      minRatio: 0.5,
      maxRatio: 0.535,
      samples: 13,
      objective: 'closest',
      preferredRatio: 0.517,
      component: 'center',
      toleranceCm: 1.2,
    }),
    defineCircumference('hips', 'Full hip / seat', {
      minRatio: 0.475,
      maxRatio: 0.515,
      samples: 17,
      objective: 'max',
      component: 'center',
      toleranceCm: 1.2,
    }),
    defineCircumference('thigh', 'Upper thigh', {
      minRatio: 0.36,
      maxRatio: 0.455,
      samples: 21,
      objective: 'max',
      component: 'right',
      toleranceCm: 1,
    }),
    defineCircumference('knee', 'Knee', {
      minRatio: 0.245,
      maxRatio: 0.3,
      samples: 17,
      objective: 'min',
      component: 'right',
      toleranceCm: 0.8,
    }),
    defineCircumference('calf', 'Calf', {
      minRatio: 0.16,
      maxRatio: 0.245,
      samples: 19,
      objective: 'max',
      component: 'right',
      toleranceCm: 0.8,
    }),
  ]),
})

export const MEASUREMENT_DEFINITIONS = Object.freeze(
  Object.fromEntries(MEASUREMENT_PROTOCOL.definitions.map((definition) => [definition.key, definition])),
)
