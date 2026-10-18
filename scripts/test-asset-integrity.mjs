import assert from 'node:assert/strict'
import { createHash, webcrypto } from 'node:crypto'
import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import {
  AssetIntegrityError,
  canonicalAssetDigestJson,
  sha256Hex,
  verifyAssetDigestFingerprint,
  verifyAssetIntegrity,
} from '../src/lib/assetIntegrity.js'

const encoder = new TextEncoder()
const buffers = {
  mesh: encoder.encode('body mesh bytes'),
  fitMesh: encoder.encode('proxy fit bytes'),
  targets: encoder.encode('compressed target bytes'),
}
const nodeSha256 = (value) => createHash('sha256').update(value).digest('hex')
const assetDigests = {
  targetsSha256: nodeSha256(buffers.targets),
  targetsDecodedSha256: nodeSha256(encoder.encode('decoded target payload')),
  meshSha256: nodeSha256(buffers.mesh),
  fitMeshSha256: nodeSha256(buffers.fitMesh),
}
const canonical = '{"fitMeshSha256":"' + assetDigests.fitMeshSha256
  + '","meshSha256":"' + assetDigests.meshSha256
  + '","targetsDecodedSha256":"' + assetDigests.targetsDecodedSha256
  + '","targetsSha256":"' + assetDigests.targetsSha256 + '"}'
const manifest = {
  assetDigests,
  assetFingerprint: nodeSha256(canonical),
}

async function rejectsWithCode(action, code) {
  await assert.rejects(action, (error) => {
    assert.ok(error instanceof AssetIntegrityError)
    assert.equal(error.code, code)
    assert.ok(error.message.length > 10)
    return true
  })
}

assert.equal(canonicalAssetDigestJson(assetDigests), canonical)
assert.equal(await sha256Hex(buffers.mesh, { crypto: webcrypto }), assetDigests.meshSha256)

const padded = new Uint8Array(buffers.mesh.byteLength + 4)
padded.set(buffers.mesh, 2)
assert.equal(
  await sha256Hex(padded.subarray(2, 2 + buffers.mesh.byteLength), { crypto: webcrypto }),
  assetDigests.meshSha256,
  'typed-array hashing must honor the view boundaries',
)

const verified = await verifyAssetIntegrity(manifest, buffers, { crypto: webcrypto })
assert.equal(verified.assetFingerprint, manifest.assetFingerprint)
assert.deepEqual(verified.assetDigests, {
  meshSha256: assetDigests.meshSha256,
  fitMeshSha256: assetDigests.fitMeshSha256,
  targetsSha256: assetDigests.targetsSha256,
  targetsDecodedSha256: assetDigests.targetsDecodedSha256,
})
assert.deepEqual(verified.verifiedAssets, {
  mesh: assetDigests.meshSha256,
  fitMesh: assetDigests.fitMeshSha256,
  targets: assetDigests.targetsSha256,
})

const tampered = { ...buffers, mesh: buffers.mesh.slice() }
tampered.mesh[0] ^= 0xff
await rejectsWithCode(
  () => verifyAssetIntegrity(manifest, tampered, { crypto: webcrypto }),
  'ASSET_DIGEST_MISMATCH',
)

await rejectsWithCode(
  () => verifyAssetDigestFingerprint({
    ...manifest,
    assetDigests: { meshSha256: assetDigests.meshSha256 },
  }, { crypto: webcrypto }),
  'MISSING_DIGEST',
)

await rejectsWithCode(
  () => verifyAssetDigestFingerprint({
    ...manifest,
    assetDigests: { ...assetDigests, targetsSha256: 'not-a-sha256' },
  }, { crypto: webcrypto }),
  'MALFORMED_DIGEST',
)

await rejectsWithCode(
  () => verifyAssetDigestFingerprint({ ...manifest, assetFingerprint: '0'.repeat(64) }, { crypto: webcrypto }),
  'FINGERPRINT_MISMATCH',
)

await rejectsWithCode(
  () => verifyAssetIntegrity(manifest, { mesh: buffers.mesh, fitMesh: buffers.fitMesh }, { crypto: webcrypto }),
  'MISSING_ASSET',
)

const geometryOnly = await verifyAssetIntegrity(
  manifest,
  { mesh: buffers.mesh, fitMesh: buffers.fitMesh },
  { requiredAssets: ['mesh', 'fitMesh'], crypto: webcrypto },
)
assert.deepEqual(Object.keys(geometryOnly.verifiedAssets), ['mesh', 'fitMesh'])

const decodedTargets = { ...buffers, targets: encoder.encode('decoded target payload') }
const decodedVerified = await verifyAssetIntegrity(manifest, decodedTargets, { crypto: webcrypto })
assert.equal(decodedVerified.verifiedAssets.targets, assetDigests.targetsDecodedSha256)

const realManifest = JSON.parse(fs.readFileSync('./public/assets/mpfb/manifest.json', 'utf8'))
const realBuffers = {
  mesh: fs.readFileSync('./public/assets/mpfb/body.mesh'),
  fitMesh: fs.readFileSync('./public/assets/mpfb/fit.mesh'),
  targets: fs.readFileSync('./public/assets/mpfb/targets.bin.gz'),
}
const realTransport = await verifyAssetIntegrity(realManifest, realBuffers, { crypto: webcrypto })
assert.equal(realTransport.verifiedAssets.targets, realManifest.assetDigests.targetsSha256)
const realDecoded = await verifyAssetIntegrity(
  realManifest,
  { ...realBuffers, targets: gunzipSync(realBuffers.targets) },
  { crypto: webcrypto },
)
assert.equal(realDecoded.verifiedAssets.targets, realManifest.assetDigests.targetsDecodedSha256)

await rejectsWithCode(
  () => verifyAssetIntegrity(manifest, buffers, { crypto: {} }),
  'CRYPTO_UNAVAILABLE',
)

process.stdout.write('Asset integrity passed: canonical fingerprint, valid buffers, tampering, malformed metadata, and partial geometry verification.\n')
