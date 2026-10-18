import { MEASUREMENT_LANDMARKS } from '../data/anatomy.js'
import { currentAnthropometryResult } from './anthropometryAudit.js'

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function fixed(value) {
  return Number.isFinite(value) ? value.toFixed(2) : ''
}

function convertLength(valueCm, unit) {
  return unit === 'imperial' ? valueCm / 2.54 : valueCm
}

function resultStatus(result) {
  if (!result) return 'Pending surface evaluation'
  const tolerance = Number.isFinite(result.toleranceCm) ? result.toleranceCm : 1
  if (Math.abs(result.residualCm) <= tolerance) return 'Within tolerance'
  if (result.calibrationStatus === 'authored-limit') return 'Authored asset limit'
  if (result.calibrationStatus === 'calibration-miss') return 'Calibration gap'
  return result.status || 'Estimated'
}

export function buildMeasurementReportCsv({ measurements, anthropometry, unit = 'metric' }) {
  const lengthUnit = unit === 'imperial' ? 'in' : 'cm'
  const massUnit = unit === 'imperial' ? 'lb' : 'kg'
  const rows = [
    ['Section', 'Measurement', 'Target', 'Surface tape', 'Residual', 'Tolerance', 'Status', 'Unit'],
    ['Foundation', 'Height', fixed(convertLength(measurements.height, unit)), '', '', '', 'Authored input', lengthUnit],
    ['Foundation', 'Mass', fixed(unit === 'imperial' ? measurements.weight * 2.20462 : measurements.weight), '', '', '', 'Authored input', massUnit],
    ...MEASUREMENT_LANDMARKS.map((landmark) => {
      const result = currentAnthropometryResult(anthropometry, landmark.key, measurements)
      return [
        landmark.region,
        landmark.label,
        fixed(convertLength(measurements[landmark.measurement], unit)),
        result ? fixed(convertLength(result.valueCm, unit)) : '',
        result ? fixed(convertLength(result.residualCm, unit)) : '',
        result ? fixed(convertLength(result.toleranceCm, unit)) : '',
        resultStatus(result),
        lengthUnit,
      ]
    }),
  ]

  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}
