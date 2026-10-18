const SHA256_PATTERN = /^[a-f0-9]{64}$/i
const GIT_COMMIT_PATTERN = /^[a-f0-9]{40}$/i

function sha256(value) {
  return typeof value === 'string' && SHA256_PATTERN.test(value) ? value.toLowerCase() : null
}

/** Keep only portable, audit-relevant manifest fields in exported reports. */
export function assetProvenanceSnapshot(manifest) {
  if (!manifest || typeof manifest !== 'object') return null
  const assetDigests = {
    meshSha256: sha256(manifest.assetDigests?.meshSha256),
    fitMeshSha256: sha256(manifest.assetDigests?.fitMeshSha256),
    targetsSha256: sha256(manifest.assetDigests?.targetsSha256),
    targetsDecodedSha256: sha256(manifest.assetDigests?.targetsDecodedSha256),
  }
  const protocolHash = sha256(manifest.measurementProtocol?.definitionSha256)
  const calibrationHash = sha256(manifest.circumferenceCalibration?.definitionSha256)
  const fingerprint = sha256(manifest.assetFingerprint)
  const sourceRevision = String(manifest.sourceRevision || '').toLowerCase()
  const sourceInputFingerprint = sha256(manifest.sourceInputs?.fingerprint)
  if (!fingerprint
    || !protocolHash
    || !calibrationHash
    || !GIT_COMMIT_PATTERN.test(sourceRevision)
    || !sourceInputFingerprint
    || Object.values(assetDigests).some((value) => !value)) return null

  return {
    application: {
      name: String(manifest.application?.name || 'unknown'),
      version: String(manifest.application?.version || 'unknown'),
    },
    source: {
      repository: String(manifest.source || 'unknown'),
      revision: sourceRevision,
      revisionBasis: String(manifest.sourceRevisionBasis || 'unknown'),
      license: String(manifest.license || 'unknown'),
      inputs: {
        algorithm: String(manifest.sourceInputs?.algorithm || 'unknown'),
        count: Number(manifest.sourceInputs?.count),
        fingerprint: sourceInputFingerprint,
      },
    },
    assetFingerprint: fingerprint,
    assetDigests,
    measurementProtocol: {
      id: String(manifest.measurementProtocol?.id || 'unknown'),
      version: Number(manifest.measurementProtocol?.version),
      topology: String(manifest.measurementProtocol?.topology || 'unknown'),
      definitionSha256: protocolHash,
    },
    circumferenceCalibration: {
      id: String(manifest.circumferenceCalibration?.id || 'unknown'),
      version: Number(manifest.circumferenceCalibration?.version),
      topology: String(manifest.circumferenceCalibration?.topology || 'unknown'),
      definitionSha256: calibrationHash,
    },
  }
}
