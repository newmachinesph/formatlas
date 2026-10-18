import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { MEASUREMENT_PROTOCOL } from '../src/data/measurementProtocol.js'
import { CIRCUMFERENCE_CALIBRATION } from '../src/data/circumferenceCalibration.js'
import { assetProvenanceSnapshot } from '../src/lib/assetProvenance.js'

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const sha256File = (filePath) => sha256(fs.readFileSync(filePath))

const manifest = JSON.parse(fs.readFileSync('./public/assets/mpfb/manifest.json', 'utf8'))
const packageMetadata = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
const expectedDigests = {
  meshSha256: sha256File('./public/assets/mpfb/body.mesh'),
  fitMeshSha256: sha256File('./public/assets/mpfb/fit.mesh'),
  targetsSha256: sha256File('./public/assets/mpfb/targets.bin.gz'),
  targetsDecodedSha256: sha256(gunzipSync(fs.readFileSync('./public/assets/mpfb/targets.bin.gz'))),
}

assert.equal(manifest.source, 'makehumancommunity/mpfb2')
assert.match(manifest.sourceRevision, /^[a-f0-9]{40}$/)
assert.notEqual(manifest.sourceRevision, 'unrecorded')
assert.ok(['build-checkout', 'verified-reproducer'].includes(manifest.sourceRevisionBasis))
assert.equal(manifest.sourceInputs.algorithm, 'sha256-canonical-path-digest-v1')
assert.equal(manifest.sourceInputs.count, 379)
assert.match(manifest.sourceInputs.fingerprint, /^[a-f0-9]{64}$/)
assert.equal(manifest.license, 'CC0-1.0')
assert.deepEqual(manifest.application, { name: packageMetadata.name, version: packageMetadata.version })
assert.deepEqual(manifest.assetDigests, expectedDigests)
assert.equal(manifest.assetFingerprint, sha256(canonicalJson(expectedDigests)))
assert.deepEqual(manifest.measurementProtocol, {
  id: MEASUREMENT_PROTOCOL.id,
  version: MEASUREMENT_PROTOCOL.version,
  topology: MEASUREMENT_PROTOCOL.topology,
  definitionSha256: sha256(canonicalJson(MEASUREMENT_PROTOCOL)),
})
assert.deepEqual(manifest.circumferenceCalibration, {
  id: CIRCUMFERENCE_CALIBRATION.id,
  version: CIRCUMFERENCE_CALIBRATION.version,
  topology: CIRCUMFERENCE_CALIBRATION.topology,
  definitionSha256: sha256(canonicalJson(CIRCUMFERENCE_CALIBRATION)),
})
const runtimeSnapshot = assetProvenanceSnapshot(manifest)
assert.equal(runtimeSnapshot.assetFingerprint, manifest.assetFingerprint)
assert.deepEqual(runtimeSnapshot.assetDigests, manifest.assetDigests)
assert.equal(runtimeSnapshot.measurementProtocol.definitionSha256, manifest.measurementProtocol.definitionSha256)
assert.deepEqual(runtimeSnapshot.circumferenceCalibration, manifest.circumferenceCalibration)
assert.equal(assetProvenanceSnapshot({ assetFingerprint: 'not-a-hash' }), null)
assert.equal(assetProvenanceSnapshot({ ...manifest, sourceRevision: 'unrecorded' }), null)

process.stdout.write(`Provenance verified: ${manifest.assetFingerprint} · protocol ${manifest.measurementProtocol.definitionSha256}.\n`)
