export const CAPTURE_LIMITS = Object.freeze({
  constrainedPixels: 2_500_000,
  standardPixels: 4_000_000,
  constrainedMemoryGb: 4,
  maximumDimension: 4096,
  maximumPixelRatio: 2,
})

function positive(value, fallback = 1) {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

/** Calculate a bounded capture size before allocating GPU or CPU buffers. */
export function captureDimensions({ width, height, pixelRatio = 1, deviceMemory } = {}) {
  const sourceWidth = positive(width)
  const sourceHeight = positive(height)
  const memory = Number(deviceMemory)
  const maximumPixels = Number.isFinite(memory) && memory <= CAPTURE_LIMITS.constrainedMemoryGb
    ? CAPTURE_LIMITS.constrainedPixels
    : CAPTURE_LIMITS.standardPixels
  const scale = Math.min(
    CAPTURE_LIMITS.maximumPixelRatio,
    positive(pixelRatio),
    CAPTURE_LIMITS.maximumDimension / sourceWidth,
    CAPTURE_LIMITS.maximumDimension / sourceHeight,
    Math.sqrt(maximumPixels / (sourceWidth * sourceHeight)),
  )
  return {
    width: Math.max(1, Math.floor(sourceWidth * scale)),
    height: Math.max(1, Math.floor(sourceHeight * scale)),
    maximumPixels,
  }
}
