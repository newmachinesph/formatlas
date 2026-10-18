function canonicalValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value)
  if (typeof value === 'string' || typeof value === 'boolean' || value === null) return value
  return String(value)
}

/**
 * Stable, collision-free-for-profile-data identity for every authored morph
 * input. Reports carry this signature so deferred geometry can never be
 * mistaken for the latest control state.
 */
export function measurementInputSignature(measurements) {
  if (!measurements || typeof measurements !== 'object' || Array.isArray(measurements)) return '[]'
  return JSON.stringify(
    Object.keys(measurements)
      .sort()
      .map((key) => [key, canonicalValue(measurements[key])]),
  )
}

export default measurementInputSignature
