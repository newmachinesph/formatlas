import {
  CONTROL_GROUPS,
  INITIAL_MEASUREMENTS,
  INITIAL_POSE,
  POSE_CONTROLS,
} from '../data/anatomy.js'
import {
  DEFAULT_APPEARANCE,
  HAIR_STYLES,
  HAIR_SWATCHES,
  SKIN_SWATCHES,
  SUIT_SWATCHES,
} from '../data/appearance.js'

export const PROFILE_VERSION = 5

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const MEASUREMENT_CONTROLS = new Map(
  Object.values(CONTROL_GROUPS).flat().map((control) => [control.key, control]),
)

const POSE_CONTROL_MAP = new Map(POSE_CONTROLS.map((control) => [control.key, control]))

const appearanceColors = {
  skinColor: [DEFAULT_APPEARANCE.skinColor, ...SKIN_SWATCHES.map((swatch) => swatch.value)],
  suitColor: [DEFAULT_APPEARANCE.suitColor, ...SUIT_SWATCHES.map((swatch) => swatch.value)],
  hairColor: [DEFAULT_APPEARANCE.hairColor, ...HAIR_SWATCHES.map((swatch) => swatch.value)],
  browColor: [DEFAULT_APPEARANCE.browColor, ...HAIR_SWATCHES.map((swatch) => swatch.value)],
}

const COLOR_LOOKUPS = Object.fromEntries(
  Object.entries(appearanceColors).map(([key, colors]) => [
    key,
    new Map(colors.map((color) => [color.toLowerCase(), color.toLowerCase()])),
  ]),
)

const HAIR_STYLE_IDS = new Set(HAIR_STYLES.map((style) => style.id))

function sourceObject(input) {
  if (typeof input === 'string') {
    try {
      return sourceObject(JSON.parse(input))
    } catch {
      return {}
    }
  }

  if (!isRecord(input)) return {}

  // Legacy v2-v4 sessions and current v5 exports use these fields directly.
  // Accepting a `profile` wrapper also makes file-import callers tolerant of a
  // common envelope without allowing arbitrary nested data into state.
  return isRecord(input.profile) ? input.profile : input
}

function finiteNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function sanitizeMeasurements(source) {
  const values = isRecord(source) ? source : {}

  return Object.fromEntries(Object.entries(INITIAL_MEASUREMENTS).map(([key, fallback]) => {
    const control = MEASUREMENT_CONTROLS.get(key)
    if (!control) return [key, fallback]

    const value = finiteNumber(values[key], fallback)
    return [key, clamp(value, control.min, control.max)]
  }))
}

function sanitizePose(source) {
  const values = isRecord(source) ? source : {}

  return Object.fromEntries(Object.entries(INITIAL_POSE).map(([key, fallback]) => {
    const control = POSE_CONTROL_MAP.get(key)
    const value = finiteNumber(values[key], fallback)
    return [key, control ? clamp(value, control.min, control.max) : fallback]
  }))
}

function sanitizeColor(key, value) {
  if (typeof value !== 'string') return DEFAULT_APPEARANCE[key]
  return COLOR_LOOKUPS[key].get(value.toLowerCase()) || DEFAULT_APPEARANCE[key]
}

function sanitizeAppearance(source) {
  const values = isRecord(source) ? source : {}

  return {
    skinColor: sanitizeColor('skinColor', values.skinColor),
    suitColor: sanitizeColor('suitColor', values.suitColor),
    hairStyle: HAIR_STYLE_IDS.has(values.hairStyle) ? values.hairStyle : DEFAULT_APPEARANCE.hairStyle,
    hairColor: sanitizeColor('hairColor', values.hairColor),
    browColor: sanitizeColor('browColor', values.browColor),
    lashIntensity: clamp(finiteNumber(values.lashIntensity, DEFAULT_APPEARANCE.lashIntensity), 0, 100),
  }
}

/**
 * Convert a legacy or current session/export into the exact runtime schema.
 * Unknown keys are discarded, missing/invalid values fall back to authored
 * defaults, and all numeric controls are clamped to their UI-supported range.
 */
export function sanitizeProfile(input) {
  const source = sourceObject(input)

  return {
    measurements: sanitizeMeasurements(source.measurements),
    pose: sanitizePose(source.pose),
    appearance: sanitizeAppearance(source.appearance),
  }
}
