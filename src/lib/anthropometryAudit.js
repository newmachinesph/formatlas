import { MEASUREMENT_DEFINITIONS, MEASUREMENT_PROTOCOL } from '../data/measurementProtocol.js'
import { measurementInputSignature } from './morphSignature.js'

const TARGET_EPSILON_CM = 0.051

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

export function anthropometryResult(report, key) {
  if (!report) return null
  if (Array.isArray(report.results)) {
    return report.results.find((result) => result?.key === key) || null
  }
  return report.results?.[key] || null
}

export function currentAnthropometryResult(report, key, targets) {
  if (report?.inputSignature !== measurementInputSignature(targets)) return null
  const result = anthropometryResult(report, key)
  const definition = MEASUREMENT_DEFINITIONS[key]
  const targetKey = result?.targetKey || definition?.targetKey || key
  const currentTarget = targets?.[targetKey]
  const measuredTarget = result?.targetCm
  const valueCm = finite(result?.valueCm) ? result.valueCm : report?.values?.[key]

  if (!result || !finite(valueCm) || !finite(currentTarget)) return null
  if (finite(measuredTarget) && Math.abs(measuredTarget - currentTarget) > TARGET_EPSILON_CM) return null

  return {
    ...result,
    key,
    targetKey,
    targetCm: finite(measuredTarget) ? measuredTarget : currentTarget,
    valueCm,
    residualCm: finite(result.residualCm) ? result.residualCm : valueCm - currentTarget,
  }
}

export function realizedMeasurementValues(report, targets) {
  return Object.fromEntries(
    MEASUREMENT_PROTOCOL.definitions
      .map(({ key }) => [key, currentAnthropometryResult(report, key, targets)?.valueCm])
      .filter(([, value]) => finite(value)),
  )
}

export function measurementsWithRealizedCircumferences(targets, report) {
  return { ...targets, ...realizedMeasurementValues(report, targets) }
}

export function serializeAnthropometry(report, targets) {
  if (!report) return null

  const rows = MEASUREMENT_PROTOCOL.definitions
    .map(({ key }) => currentAnthropometryResult(report, key, targets))
    .filter(Boolean)

  if (!rows.length) return null

  return {
    inputSignature: report.inputSignature,
    values: Object.fromEntries(rows.map((result) => [result.key, result.valueCm])),
    residuals: Object.fromEntries(rows.map((result) => [result.key, result.residualCm])),
    toleranceCm: Object.fromEntries(rows.map((result) => [result.key, result.toleranceCm])),
    confidence: Object.fromEntries(rows.map((result) => [result.key, result.confidence])),
    yRatios: Object.fromEntries(rows.map((result) => [result.key, result.yRatio])),
    status: Object.fromEntries(rows.map((result) => [result.key, result.status || 'estimated'])),
    calibrationStatus: Object.fromEntries(rows.map((result) => [result.key, result.calibrationStatus || null])),
    complete: rows.length === MEASUREMENT_PROTOCOL.definitions.length,
    measuredCount: rows.length,
  }
}

/** A report is capture-safe only when every protocol row matches this profile. */
export function isAnthropometryComplete(report, targets) {
  return serializeAnthropometry(report, targets)?.complete === true
}

export function anthropometryProtocolSnapshot(report) {
  const protocol = report?.protocol || MEASUREMENT_PROTOCOL
  const provenance = report?.provenance
  return {
    id: protocol.id,
    version: protocol.version,
    topology: protocol.topology,
    method: 'neutral-mesh triangle-plane convex tape envelope',
    status: 'experimental',
    definitionSha256: provenance?.measurementProtocol?.definitionSha256 || null,
    circumferenceCalibration: provenance?.circumferenceCalibration || null,
    assetFingerprint: provenance?.assetFingerprint || null,
    assetDigests: provenance?.assetDigests || null,
    source: provenance?.source || null,
    application: provenance?.application || null,
  }
}
