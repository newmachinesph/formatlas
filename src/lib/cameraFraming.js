const MIN_ASPECT = 0.08
const MIN_FOV_DEGREES = 1
const MAX_FOV_DEGREES = 178

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback
}

export function normalizeModelBounds(bounds) {
  const min = bounds?.min
  const max = bounds?.max
  if (!min || !max) return null

  const minX = finiteOr(min.x, Number.NaN)
  const minY = finiteOr(min.y, Number.NaN)
  const minZ = finiteOr(min.z, Number.NaN)
  const maxX = finiteOr(max.x, Number.NaN)
  const maxY = finiteOr(max.y, Number.NaN)
  const maxZ = finiteOr(max.z, Number.NaN)
  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) return null
  if (maxX <= minX || maxY <= minY || maxZ <= minZ) return null

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  }
}

export function unionModelBounds(...boundsList) {
  const validBounds = boundsList.map(normalizeModelBounds).filter(Boolean)
  if (!validBounds.length) return null

  return validBounds.slice(1).reduce((union, bounds) => ({
    min: {
      x: Math.min(union.min.x, bounds.min.x),
      y: Math.min(union.min.y, bounds.min.y),
      z: Math.min(union.min.z, bounds.min.z),
    },
    max: {
      x: Math.max(union.max.x, bounds.max.x),
      y: Math.max(union.max.y, bounds.max.y),
      z: Math.max(union.max.z, bounds.max.z),
    },
  }), validBounds[0])
}

/** Expands X/Z to a radial envelope around the stage origin for any Y rotation. */
export function makeYRotationSafeBounds(bounds) {
  const normalized = normalizeModelBounds(bounds)
  if (!normalized) return null
  const radialExtent = Math.max(
    Math.hypot(normalized.min.x, normalized.min.z),
    Math.hypot(normalized.min.x, normalized.max.z),
    Math.hypot(normalized.max.x, normalized.min.z),
    Math.hypot(normalized.max.x, normalized.max.z),
  )

  return {
    min: { x: -radialExtent, y: normalized.min.y, z: -radialExtent },
    max: { x: radialExtent, y: normalized.max.y, z: radialExtent },
  }
}

/**
 * Frames an axis-aligned model from +Z with a perspective camera. The returned
 * distance accounts for the nearest face of the box, so every corner remains
 * visible even in very narrow portrait viewports.
 */
export function framePerspectiveBounds(bounds, options = {}) {
  const normalized = normalizeModelBounds(bounds)
  if (!normalized) return null

  const aspect = Math.max(MIN_ASPECT, finiteOr(options.aspect, 1))
  const verticalFov = Math.min(
    MAX_FOV_DEGREES,
    Math.max(MIN_FOV_DEGREES, finiteOr(options.verticalFovDegrees, 50)),
  ) * Math.PI / 180
  const margin = Math.max(1, finiteOr(options.margin, 1.12))
  const halfWidth = (normalized.max.x - normalized.min.x) * 0.5
  const halfHeight = (normalized.max.y - normalized.min.y) * 0.5
  const halfDepth = (normalized.max.z - normalized.min.z) * 0.5
  const center = {
    x: (normalized.min.x + normalized.max.x) * 0.5,
    y: (normalized.min.y + normalized.max.y) * 0.5,
    z: (normalized.min.z + normalized.max.z) * 0.5,
  }
  const verticalTangent = Math.tan(verticalFov * 0.5)
  const horizontalTangent = verticalTangent * aspect
  const distance = halfDepth + Math.max(
    (halfHeight * margin) / verticalTangent,
    (halfWidth * margin) / horizontalTangent,
  )
  const radius = Math.hypot(halfWidth, halfHeight, halfDepth)

  return {
    target: center,
    position: { x: center.x, y: center.y, z: center.z + distance },
    distance,
    radius,
    near: Math.max(0.01, distance - radius * 1.35),
    far: Math.max(50, distance + radius * 4),
  }
}

export function makeFaceBounds(bounds) {
  const normalized = normalizeModelBounds(bounds)
  if (!normalized) return null

  const height = normalized.max.y - normalized.min.y
  const centerX = (normalized.min.x + normalized.max.x) * 0.5
  const centerZ = (normalized.min.z + normalized.max.z) * 0.5
  const halfHeight = height * 0.145
  const halfWidth = height * 0.13
  const halfDepth = height * 0.11
  const centerY = normalized.max.y - halfHeight * 0.86

  return {
    min: { x: centerX - halfWidth, y: centerY - halfHeight, z: centerZ - halfDepth },
    max: { x: centerX + halfWidth, y: centerY + halfHeight, z: centerZ + halfDepth },
  }
}
