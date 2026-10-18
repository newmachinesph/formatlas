export function formatHeight(heightCm, unit = 'metric') {
  if (typeof heightCm !== 'number' || !Number.isFinite(heightCm)) return '—'
  if (unit !== 'imperial') return `${heightCm.toFixed(1)} cm`

  const totalInches = Math.max(0, Math.round(heightCm / 2.54))
  return `${Math.floor(totalInches / 12)}′ ${totalInches % 12}″`
}

export default formatHeight
