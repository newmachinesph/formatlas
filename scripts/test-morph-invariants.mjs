import assert from 'node:assert/strict'
import fs from 'node:fs'
import zlib from 'node:zlib'
import { morphMpfb, reposeMpfb } from '../src/lib/mpfb.js'
import { measurementInputSignature } from '../src/lib/morphSignature.js'
import { currentAnthropometryResult } from '../src/lib/anthropometryAudit.js'
import {
  INITIAL_MEASUREMENTS,
  INITIAL_POSE,
  MEASUREMENT_LANDMARKS,
  PRESETS,
} from '../src/data/anatomy.js'

function loadMesh(path) {
  const buffer = fs.readFileSync(path)
  assert.equal(buffer.subarray(0, 4).toString(), 'MPFM')
  const vertexCount = buffer.readUInt32LE(8)
  const indexCount = buffer.readUInt32LE(12)
  const positionOffset = 24
  const positions = new Float32Array(
    buffer.buffer,
    buffer.byteOffset + positionOffset,
    vertexCount * 3,
  ).slice()
  const indexOffset = positionOffset + positions.byteLength
  const indices = new Uint32Array(
    buffer.buffer,
    buffer.byteOffset + indexOffset,
    indexCount,
  ).slice()
  return { positions, indices }
}

function loadTargets(path) {
  const buffer = zlib.gunzipSync(fs.readFileSync(path))
  assert.equal(buffer.subarray(0, 4).toString(), 'MPFT')
  const metadataLength = buffer.readUInt32LE(8)
  const metadata = JSON.parse(buffer.subarray(16, 16 + metadataLength).toString('utf8'))
  const dataStart = 16 + metadataLength + ((4 - (metadataLength % 4)) % 4)
  return new Map(Object.entries(metadata.targets).map(([id, descriptor]) => [id, {
    indices: new Uint32Array(
      buffer.buffer,
      buffer.byteOffset + dataStart + descriptor.indexOffset,
      descriptor.count,
    ),
    deltas: new Float32Array(
      buffer.buffer,
      buffer.byteOffset + dataStart + descriptor.deltaOffset,
      descriptor.count * 3,
    ),
  }]))
}

const mesh = loadMesh('./public/assets/mpfb/body.mesh')
const assets = {
  ...mesh,
  targets: loadTargets('./public/assets/mpfb/targets.bin.gz'),
}

const profiles = [
  ...PRESETS.map((preset) => [preset.id, { ...INITIAL_MEASUREMENTS, ...preset.changes }]),
  ['range-min', {
    ...INITIAL_MEASUREMENTS,
    height: 142,
    weight: 40,
    waist: 52,
    hips: 74,
    highHip: 68,
    thigh: 36,
    knee: 28,
    calf: 24,
    headHeight: 16,
    headWidth: 12.5,
    headDepth: 16,
  }],
  ['range-max', {
    ...INITIAL_MEASUREMENTS,
    height: 198,
    weight: 125,
    waist: 116,
    hips: 132,
    highHip: 120,
    thigh: 80,
    knee: 48,
    calf: 54,
    headHeight: 25,
    headWidth: 18.5,
    headDepth: 23.5,
  }],
]
const shippedPresetNames = new Set(PRESETS.map((preset) => preset.id))
let preparedDefault = null

for (const [name, measurements] of profiles) {
  const result = morphMpfb(assets, measurements, INITIAL_POSE)
  if (name === 'balanced') preparedDefault = result
  assert.ok(result.maxY > result.minY, `${name}: invalid vertical bounds`)
  assert.ok(result.positions.every(Number.isFinite), `${name}: non-finite vertex`)
  assert.ok(result.faceAnchor, `${name}: missing face anchor for fitted pupils`)
  assert.ok(
    [result.faceAnchor.y, result.faceAnchor.eyeX, result.faceAnchor.frontZ].every(Number.isFinite),
    `${name}: invalid face anchor for fitted pupils`,
  )
  assert.ok(result.faceAnchor.eyeX > 0.08 && result.faceAnchor.eyeX < 0.8, `${name}: implausible pupil spacing`)
  assert.equal('sections' in result, false, `${name}: heuristic sections must not remain authoritative`)
  assert.ok(result.anthropometry?.protocol?.id, `${name}: missing anthropometry protocol`)
  assert.equal(
    result.anthropometry.inputSignature,
    measurementInputSignature(measurements),
    `${name}: anthropometry is not stamped with the full morph input`,
  )
  assert.ok(Number.isInteger(result.anthropometry.protocol.version), `${name}: invalid anthropometry protocol version`)

  for (const landmark of MEASUREMENT_LANDMARKS) {
    const measurement = result.anthropometry.results[landmark.key]
    const ribbon = result.anthropometry.ribbons[landmark.key]
    assert.ok(measurement, `${name}: missing ${landmark.key} measurement result`)
    assert.ok(
      ['within-tolerance', 'outside-tolerance', 'unmeasurable'].includes(measurement.status),
      `${name}: invalid ${landmark.key} status`,
    )
    assert.equal(measurement.targetCm, measurements[landmark.measurement], `${name}: ${landmark.key} target drifted`)
    assert.ok(Number.isFinite(measurement.toleranceCm) && measurement.toleranceCm > 0, `${name}: invalid ${landmark.key} tolerance`)
    assert.ok(measurement.confidence >= 0 && measurement.confidence <= 1, `${name}: invalid ${landmark.key} confidence`)
    if (shippedPresetNames.has(name)) {
      assert.equal(
        measurement.status,
        'within-tolerance',
        `${name}: shipped ${landmark.key} target exceeds its declared tolerance (${measurement.residualCm} cm)`,
      )
    }
    assert.ok(
      ['within-tolerance', 'authored-limit', 'calibration-miss', 'unmeasurable'].includes(measurement.calibrationStatus),
      `${name}: ${landmark.key} lacks a truthful calibration status`,
    )
    if (measurement.status === 'outside-tolerance') {
      assert.ok(
        measurement.calibrationStatus === 'authored-limit' || measurement.calibrationStatus === 'calibration-miss',
        `${name}: ${landmark.key} silently overpromises an unsupported target`,
      )
    }

    if (measurement.status === 'unmeasurable') {
      assert.equal(result.anthropometry.values[landmark.key], null, `${name}: unmeasurable ${landmark.key} exposed a value`)
      assert.deepEqual(ribbon, [], `${name}: unmeasurable ${landmark.key} exposed a ribbon`)
      continue
    }

    assert.ok(Number.isFinite(measurement.valueCm), `${name}: non-finite ${landmark.key} model value`)
    assert.ok(Number.isFinite(measurement.residualCm), `${name}: non-finite ${landmark.key} residual`)
    assert.equal(result.anthropometry.values[landmark.key], measurement.valueCm, `${name}: ${landmark.key} value/result disagreement`)
    assert.ok(
      Math.abs(measurement.residualCm - (measurement.valueCm - measurement.targetCm)) < 1e-9,
      `${name}: ${landmark.key} residual is not model minus target`,
    )
    assert.ok(Array.isArray(ribbon) && ribbon.length >= 4, `${name}: invalid ${landmark.key} ribbon`)
    assert.ok(ribbon.flat().every(Number.isFinite), `${name}: non-finite ${landmark.key} ribbon point`)
    if (measurement.closed) assert.deepEqual(ribbon[0], ribbon.at(-1), `${name}: ${landmark.key} ribbon is not closed`)
  }

  assert.ok(result.anthropometry.results.thigh.yRatio > result.anthropometry.results.knee.yRatio, `${name}: knee must sit below thigh`)
  assert.ok(result.anthropometry.results.knee.yRatio > result.anthropometry.results.calf.yRatio, `${name}: knee must sit above calf`)
}

const alternatePose = { ...INITIAL_POSE, arms: 66, stance: 61 }
const poseOnly = reposeMpfb(assets, INITIAL_MEASUREMENTS, alternatePose, preparedDefault)
const poseFresh = morphMpfb(assets, INITIAL_MEASUREMENTS, alternatePose)
assert.deepEqual(
  poseOnly.anthropometry.values,
  poseFresh.anthropometry.values,
  'pose-only cache path must preserve realized neutral measurements',
)
for (let index = 0; index < poseFresh.positions.length; index += 97) {
  assert.ok(
    Math.abs(poseOnly.positions[index] - poseFresh.positions[index]) < 1e-7,
    'pose-only cache path must reproduce fresh posed vertices',
  )
}

const neutral = morphMpfb(assets, INITIAL_MEASUREMENTS, INITIAL_POSE)
const fullerBustMeasurements = { ...INITIAL_MEASUREMENTS, bustSize: 100 }
const fullerBust = morphMpfb(assets, fullerBustMeasurements, INITIAL_POSE)
assert.ok(
  Math.abs(fullerBust.anthropometry.calibrationPreliminaryValues.bust - neutral.anthropometry.calibrationPreliminaryValues.bust) > 5,
  'non-circumference sculpt controls must affect the pre-calibration surface',
)
assert.equal(
  currentAnthropometryResult(neutral.anthropometry, 'bust', fullerBustMeasurements),
  null,
  'a report from before a non-target sculpt change must be rejected as stale',
)
const wideStance = morphMpfb(assets, INITIAL_MEASUREMENTS, { ...INITIAL_POSE, stance: 80 })
assert.notDeepEqual(
  wideStance.anthropometry.ribbons.calf,
  neutral.anthropometry.ribbons.calf,
  'posed anthropometry ribbons must follow the deformed mesh',
)

const saturatedAt95Kg = morphMpfb(assets, { ...INITIAL_MEASUREMENTS, weight: 95 }, INITIAL_POSE)
const saturatedAt125Kg = morphMpfb(assets, { ...INITIAL_MEASUREMENTS, weight: 125 }, INITIAL_POSE)
assert.deepEqual(
  saturatedAt125Kg.positions,
  saturatedAt95Kg.positions,
  'macro geometry must remain fixed after the supported BMI ceiling is reached',
)

console.log(`Validated ${profiles.length} profiles, ${mesh.positions.length / 3} vertices, and ${MEASUREMENT_LANDMARKS.length} realized anthropometry results.`)
