import assert from 'node:assert/strict'
import { INITIAL_MEASUREMENTS } from '../src/data/anatomy.js'
import { buildMeasurementReportCsv } from '../src/lib/measurementReport.js'
import { measurementInputSignature } from '../src/lib/morphSignature.js'

const report = {
  inputSignature: measurementInputSignature(INITIAL_MEASUREMENTS),
  results: [{
    key: 'waist',
    targetKey: 'waist',
    targetCm: INITIAL_MEASUREMENTS.waist,
    valueCm: 72,
    residualCm: 0.5,
    toleranceCm: 1,
    status: 'estimated',
  }],
}

const metric = buildMeasurementReportCsv({ measurements: INITIAL_MEASUREMENTS, anthropometry: report })
assert.match(metric, /^Section,Measurement,Target,Surface tape,Residual,Tolerance,Status,Unit\r\n/)
assert.match(metric, /torso,Natural waist,71\.50,72\.00,0\.50,1\.00,Within tolerance,cm/)
assert.match(metric, /bust,Bust,88\.00,,,,Pending surface evaluation,cm/)

const imperial = buildMeasurementReportCsv({ measurements: INITIAL_MEASUREMENTS, anthropometry: report, unit: 'imperial' })
assert.match(imperial, /Foundation,Mass,127\.87,,,,Authored input,lb/)
assert.match(imperial, /torso,Natural waist,28\.15,28\.35,0\.20,0\.39,Within tolerance,in/)

const stale = buildMeasurementReportCsv({
  measurements: { ...INITIAL_MEASUREMENTS, waist: INITIAL_MEASUREMENTS.waist + 1 },
  anthropometry: report,
})
assert.match(stale, /torso,Natural waist,72\.50,,,,Pending surface evaluation,cm/)

process.stdout.write('Measurement report passed: metric, imperial, status, pending, and stale-audit rejection.\n')
