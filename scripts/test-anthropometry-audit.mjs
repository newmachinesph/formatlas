import assert from 'node:assert/strict'
import {
  anthropometryProtocolSnapshot,
  anthropometryResult,
  currentAnthropometryResult,
  isAnthropometryComplete,
  measurementsWithRealizedCircumferences,
  realizedMeasurementValues,
  serializeAnthropometry,
} from '../src/lib/anthropometryAudit.js'
import { measurementInputSignature } from '../src/lib/morphSignature.js'

const targets = { bust: 88, waist: 70, hips: 98, height: 164, bustSize: 50 }
const report = {
  inputSignature: measurementInputSignature(targets),
  protocol: { id: 'test-tape', version: 3, topology: 'fixture' },
  values: { bust: 86.2, waist: 72.4 },
  results: {
    bust: { key: 'bust', targetCm: 88, valueCm: 86.2, residualCm: -1.8, toleranceCm: 1.2, confidence: 0.95, yRatio: 0.69, status: 'outside-tolerance', calibrationStatus: 'authored-limit' },
    waist: { key: 'waist', targetCm: 70, valueCm: 72.4, residualCm: 2.4, toleranceCm: 1, confidence: 1, yRatio: 0.59, status: 'outside-tolerance' },
  },
  provenance: {
    application: { name: 'fixture-app', version: '1.2.3' },
    source: { repository: 'fixture/repo', revision: 'abc1234', license: 'CC0-1.0' },
    assetFingerprint: 'a'.repeat(64),
    assetDigests: {
      meshSha256: 'b'.repeat(64),
      fitMeshSha256: 'c'.repeat(64),
      targetsSha256: 'd'.repeat(64),
    },
    measurementProtocol: { definitionSha256: 'e'.repeat(64) },
    circumferenceCalibration: {
      id: 'fixture-calibration',
      version: 2,
      topology: 'fixture',
      definitionSha256: 'f'.repeat(64),
    },
  },
}

assert.equal(
  measurementInputSignature({ waist: 70, bust: 88 }),
  measurementInputSignature({ bust: 88, waist: 70 }),
  'input signatures must not depend on object insertion order',
)
assert.notEqual(
  measurementInputSignature({ bust: 88, bustSize: 50 }),
  measurementInputSignature({ bust: 88, bustSize: 51 }),
  'every morph input must participate in freshness',
)

assert.equal(anthropometryResult(report, 'bust').valueCm, 86.2)
assert.equal(currentAnthropometryResult(report, 'bust', targets).residualCm, -1.8)
assert.deepEqual(realizedMeasurementValues(report, targets), { bust: 86.2, waist: 72.4 })
assert.deepEqual(measurementsWithRealizedCircumferences(targets, report), {
  ...targets,
  bust: 86.2,
  waist: 72.4,
})

const snapshot = serializeAnthropometry(report, targets)
assert.equal(snapshot.inputSignature, report.inputSignature)
assert.deepEqual(snapshot.values, { bust: 86.2, waist: 72.4 })
assert.deepEqual(snapshot.residuals, { bust: -1.8, waist: 2.4 })
assert.deepEqual(snapshot.toleranceCm, { bust: 1.2, waist: 1 })
assert.deepEqual(snapshot.confidence, { bust: 0.95, waist: 1 })
assert.deepEqual(snapshot.yRatios, { bust: 0.69, waist: 0.59 })
assert.deepEqual(snapshot.calibrationStatus, { bust: 'authored-limit', waist: null })
assert.equal(snapshot.complete, false)
assert.equal(isAnthropometryComplete(report, targets), false)
assert.equal(snapshot.measuredCount, 2)
assert.deepEqual(anthropometryProtocolSnapshot(report), {
  id: 'test-tape',
  version: 3,
  topology: 'fixture',
  method: 'neutral-mesh triangle-plane convex tape envelope',
  status: 'experimental',
  definitionSha256: 'e'.repeat(64),
  circumferenceCalibration: report.provenance.circumferenceCalibration,
  assetFingerprint: 'a'.repeat(64),
  assetDigests: report.provenance.assetDigests,
  source: report.provenance.source,
  application: report.provenance.application,
})

const stale = structuredClone(report)
stale.results.bust.targetCm = 87.8
assert.equal(currentAnthropometryResult(stale, 'bust', targets), null)
assert.deepEqual(realizedMeasurementValues(stale, targets), { waist: 72.4 })

const reshapedWithoutTargetChange = { ...targets, bustSize: 100 }
assert.equal(
  currentAnthropometryResult(report, 'bust', reshapedWithoutTargetChange),
  null,
  'a non-target sculpt change must invalidate the entire realized report',
)
assert.equal(serializeAnthropometry(report, reshapedWithoutTargetChange), null)
assert.equal(isAnthropometryComplete(report, reshapedWithoutTargetChange), false)
assert.equal(serializeAnthropometry(null, targets), null)

const arrayReport = { ...report, results: Object.values(report.results) }
assert.equal(anthropometryResult(arrayReport, 'waist').valueCm, 72.4)

process.stdout.write('Anthropometry audit passed: freshness, realized overlays, serialization, and protocol provenance.\n')
