export function classifyBodyPoint({ x, y }) {
  const absoluteX = Math.abs(x)
  const armCenterY = 4.55 - (absoluteX - 1.45) * 0.78
  if (y > 5.42) return 'head'
  if (y > 4.45 && absoluteX < 1.12) return 'neck'
  if (absoluteX > 1.34 && Math.abs(y - armCenterY) < 1.28) return 'arms'
  if (y < -1.18) return 'legs'
  if (y < 0.86) return 'pelvis'
  if (y < 2.34) return 'waist'
  if (y < 4.04 && absoluteX < 1.72) return 'bust'
  return 'torso'
}

export function classifyBodyFace(face, basePositions) {
  if (!face || !basePositions) return null
  const counts = new Map()
  for (const vertex of [face.a, face.b, face.c]) {
    const offset = vertex * 3
    if (!Number.isInteger(vertex) || offset < 0 || offset + 2 >= basePositions.length) continue
    const region = classifyBodyPoint({ x: basePositions[offset], y: basePositions[offset + 1] })
    counts.set(region, (counts.get(region) || 0) + 1)
  }

  let selected = null
  let selectedCount = 0
  for (const [region, count] of counts) {
    if (count > selectedCount) {
      selected = region
      selectedCount = count
    }
  }
  return selected
}
