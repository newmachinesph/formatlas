export const MODEL_BMI_DOMAIN = Object.freeze({ min: 15, max: 35 })

const finiteOr = (value, fallback) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
)

/**
 * Describe the authored MakeHuman macro-weight domain for a profile.
 *
 * The current target set blends from BMI 15 through BMI 35. Values outside
 * that interval are valid profile inputs, but the macro body-mass deformation
 * is clamped to the nearest authored endpoint and cannot express further
 * visual change.
 */
export function assessModelDomain(measurements) {
  const heightCm = Math.max(1, finiteOr(measurements?.height, 164))
  const weightKg = Math.max(0, finiteOr(measurements?.weight, 58))
  const heightMetres = heightCm / 100
  const bmi = weightKg / (heightMetres ** 2)
  const effectiveBmi = Math.min(MODEL_BMI_DOMAIN.max, Math.max(MODEL_BMI_DOMAIN.min, bmi))
  const status = bmi < MODEL_BMI_DOMAIN.min
    ? 'below'
    : bmi > MODEL_BMI_DOMAIN.max ? 'above' : 'within'

  return {
    bmi,
    effectiveBmi,
    status,
    saturated: status !== 'within',
    supportedBmi: [MODEL_BMI_DOMAIN.min, MODEL_BMI_DOMAIN.max],
    supportedWeightKg: [
      MODEL_BMI_DOMAIN.min * (heightMetres ** 2),
      MODEL_BMI_DOMAIN.max * (heightMetres ** 2),
    ],
    effectiveWeightKg: effectiveBmi * (heightMetres ** 2),
  }
}

export default assessModelDomain
