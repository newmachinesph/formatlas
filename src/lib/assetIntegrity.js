const SHA256_PATTERN = /^[a-f0-9]{64}$/i

export const ASSET_DIGEST_FIELDS = Object.freeze({
  mesh: 'meshSha256',
  fitMesh: 'fitMeshSha256',
  targets: 'targetsSha256',
})

export const TARGETS_DECODED_DIGEST_FIELD = 'targetsDecodedSha256'

const ASSET_NAMES = Object.freeze(Object.keys(ASSET_DIGEST_FIELDS))
const DIGEST_FIELDS = Object.freeze([
  ...Object.values(ASSET_DIGEST_FIELDS),
  TARGETS_DECODED_DIGEST_FIELD,
])

export class AssetIntegrityError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'AssetIntegrityError'
    this.code = code
    this.details = Object.freeze({ ...details })
  }
}

function normalizedDigest(value, field) {
  if (value === undefined || value === null || value === '') {
    throw new AssetIntegrityError(
      'MISSING_DIGEST',
      `MPFB manifest is missing the required ${field} digest.`,
      { field },
    )
  }
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    throw new AssetIntegrityError(
      'MALFORMED_DIGEST',
      `MPFB manifest contains a malformed ${field} digest.`,
      { field },
    )
  }
  return value.toLowerCase()
}

function normalizedFingerprint(value) {
  if (value === undefined || value === null || value === '') {
    throw new AssetIntegrityError(
      'MISSING_FINGERPRINT',
      'MPFB manifest is missing its asset fingerprint.',
    )
  }
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    throw new AssetIntegrityError(
      'MALFORMED_FINGERPRINT',
      'MPFB manifest contains a malformed asset fingerprint.',
    )
  }
  return value.toLowerCase()
}

function normalizeAssetDigests(manifest) {
  const source = manifest?.assetDigests
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new AssetIntegrityError(
      'MISSING_DIGEST',
      'MPFB manifest is missing its asset digest table.',
      { field: DIGEST_FIELDS[0] },
    )
  }

  const unexpectedFields = Object.keys(source).filter((field) => !DIGEST_FIELDS.includes(field))
  if (unexpectedFields.length > 0) {
    throw new AssetIntegrityError(
      'UNEXPECTED_DIGEST',
      `MPFB manifest contains an unsupported asset digest field: ${unexpectedFields[0]}.`,
      { field: unexpectedFields[0] },
    )
  }

  return Object.freeze(
    Object.fromEntries(DIGEST_FIELDS.map((field) => [field, normalizedDigest(source[field], field)])),
  )
}

/**
 * Serialize the exact digest table used by the MPFB asset builder. Keys are
 * sorted so the same manifest produces the same fingerprint in every runtime.
 */
export function canonicalAssetDigestJson(assetDigests) {
  const normalized = normalizeAssetDigests({ assetDigests })
  return `{${Object.keys(normalized)
    .sort()
    .map((field) => `${JSON.stringify(field)}:${JSON.stringify(normalized[field])}`)
    .join(',')}}`
}

function subtleCrypto(cryptoProvider) {
  const subtle = cryptoProvider?.subtle
  if (!subtle || typeof subtle.digest !== 'function') {
    throw new AssetIntegrityError(
      'CRYPTO_UNAVAILABLE',
      'This browser cannot verify the downloaded 3D assets because Web Crypto is unavailable.',
    )
  }
  return subtle
}

function isBufferSource(value) {
  return value instanceof ArrayBuffer || ArrayBuffer.isView(value)
}

/** Hash an ArrayBuffer or typed-array view with browser-native Web Crypto. */
export async function sha256Hex(value, { crypto = globalThis.crypto } = {}) {
  if (!isBufferSource(value)) {
    throw new AssetIntegrityError(
      'INVALID_ASSET_BUFFER',
      'Asset verification requires an ArrayBuffer or typed-array view.',
    )
  }

  let digest
  try {
    digest = await subtleCrypto(crypto).digest('SHA-256', value)
  } catch (cause) {
    if (cause instanceof AssetIntegrityError) throw cause
    throw new AssetIntegrityError(
      'HASH_FAILED',
      'The browser could not calculate an asset SHA-256 digest.',
      { cause: String(cause?.message || cause) },
    )
  }
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Validate the digest table and its canonical manifest fingerprint. */
export async function verifyAssetDigestFingerprint(manifest, options = {}) {
  const assetDigests = normalizeAssetDigests(manifest)
  const assetFingerprint = normalizedFingerprint(manifest?.assetFingerprint)
  const canonicalBytes = new TextEncoder().encode(canonicalAssetDigestJson(assetDigests))
  const actualFingerprint = await sha256Hex(canonicalBytes, options)

  if (actualFingerprint !== assetFingerprint) {
    throw new AssetIntegrityError(
      'FINGERPRINT_MISMATCH',
      'MPFB manifest fingerprint does not match its canonical asset digest table.',
      { expected: assetFingerprint, actual: actualFingerprint },
    )
  }

  return { assetDigests, assetFingerprint }
}

function normalizeRequiredAssets(requiredAssets) {
  if (!Array.isArray(requiredAssets) || requiredAssets.length === 0) {
    throw new AssetIntegrityError(
      'INVALID_ASSET_SET',
      'Asset verification requires at least one named MPFB asset.',
    )
  }
  const unique = [...new Set(requiredAssets)]
  const unsupported = unique.find((assetName) => !ASSET_NAMES.includes(assetName))
  if (unsupported) {
    throw new AssetIntegrityError(
      'UNKNOWN_ASSET',
      `Asset verification does not recognize ${String(unsupported)}.`,
      { assetName: unsupported },
    )
  }
  return unique
}

/**
 * Verify already-downloaded MPFB buffers before parsing them.
 *
 * The default requires mesh, fitMesh, and targets. Geometry-only callers can
 * explicitly pass `requiredAssets: ['mesh', 'fitMesh']` while still validating
 * that the manifest fingerprint covers the complete authored digest table.
 */
export async function verifyAssetIntegrity(
  manifest,
  assetBuffers,
  { requiredAssets = ASSET_NAMES, crypto = globalThis.crypto } = {},
) {
  const required = normalizeRequiredAssets(requiredAssets)
  if (!assetBuffers || typeof assetBuffers !== 'object') {
    throw new AssetIntegrityError('MISSING_ASSET', 'Downloaded MPFB asset buffers are missing.')
  }

  const verifiedManifest = await verifyAssetDigestFingerprint(manifest, { crypto })
  const inputs = required.map((assetName) => {
    const buffer = assetBuffers[assetName]
    if (!isBufferSource(buffer)) {
      throw new AssetIntegrityError(
        'MISSING_ASSET',
        `Downloaded MPFB ${assetName} data is missing or invalid.`,
        { assetName },
      )
    }
    const digestField = ASSET_DIGEST_FIELDS[assetName]
    const expected = assetName === 'targets'
      ? [
          verifiedManifest.assetDigests[digestField],
          verifiedManifest.assetDigests[TARGETS_DECODED_DIGEST_FIELD],
        ]
      : [verifiedManifest.assetDigests[digestField]]
    return { assetName, buffer, expected }
  })
  const actualDigests = await Promise.all(inputs.map(({ buffer }) => sha256Hex(buffer, { crypto })))
  const verifiedAssets = {}
  for (let index = 0; index < inputs.length; index += 1) {
    const { assetName, expected } = inputs[index]
    const actual = actualDigests[index]
    if (!expected.includes(actual)) {
      throw new AssetIntegrityError(
        'ASSET_DIGEST_MISMATCH',
        `Downloaded MPFB ${assetName} data failed its SHA-256 integrity check.`,
        { assetName, expected, actual },
      )
    }
    verifiedAssets[assetName] = actual
  }

  return {
    ...verifiedManifest,
    verifiedAssets: Object.freeze(verifiedAssets),
  }
}
