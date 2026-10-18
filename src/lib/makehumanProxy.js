import * as THREE from 'three'

export const MHPX_HEADER_BYTES = 64
export const MHPX_VERSION = 1

const MAGIC = [0x4d, 0x48, 0x50, 0x58] // MHPX
const SCALE_AXIS_COUNT = 3
const SCALE_REF_COUNT = SCALE_AXIS_COUNT * 2
const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT
const UINT_BYTES = Uint32Array.BYTES_PER_ELEMENT

function asStandaloneArrayBuffer(data) {
  if (data instanceof ArrayBuffer) return data
  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  }
  throw new TypeError('MHPX data must be an ArrayBuffer or an ArrayBuffer view')
}

function assertMagic(bytes) {
  if (MAGIC.some((value, index) => bytes[index] !== value)) {
    throw new Error('Invalid MakeHuman proxy asset: expected MHPX magic')
  }
}

function checkedBytes(count, components, label) {
  const byteLength = count * components * UINT_BYTES
  if (!Number.isSafeInteger(byteLength)) {
    throw new Error(`Invalid MakeHuman proxy asset: ${label} byte length overflow`)
  }
  return byteLength
}

function assertFiniteArray(values, label) {
  for (let index = 0; index < values.length; index += 1) {
    if (!Number.isFinite(values[index])) {
      throw new Error(`Invalid MakeHuman proxy asset: ${label}[${index}] is not finite`)
    }
  }
}

function assertIndexRange(values, upperBound, label) {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (!Number.isInteger(value) || value < 0 || value >= upperBound) {
      throw new Error(
        `Invalid MakeHuman proxy asset: ${label}[${index}] (${value}) is outside 0..${upperBound - 1}`,
      )
    }
  }
}

/**
 * Parse the compact, little-endian MHPX v1 runtime format.
 *
 * The returned arrays are standalone copies so callers can safely transfer or
 * release the original network buffer after parsing.
 */
export function parseMHProxy(data) {
  const buffer = asStandaloneArrayBuffer(data)
  if (buffer.byteLength < MHPX_HEADER_BYTES) {
    throw new Error(
      `Invalid MakeHuman proxy asset: expected at least ${MHPX_HEADER_BYTES} bytes, received ${buffer.byteLength}`,
    )
  }

  const bytes = new Uint8Array(buffer)
  assertMagic(bytes)

  const header = new DataView(buffer, 0, MHPX_HEADER_BYTES)
  const version = header.getUint32(4, true)
  const sourceCount = header.getUint32(8, true)
  const renderCount = header.getUint32(12, true)
  const indexCount = header.getUint32(16, true)
  const headerBytes = header.getUint32(20, true)
  const flags = header.getUint32(60, true)

  if (version !== MHPX_VERSION) {
    throw new Error(`Unsupported MakeHuman proxy version ${version}`)
  }
  if (headerBytes !== MHPX_HEADER_BYTES) {
    throw new Error(`Unsupported MakeHuman proxy header size ${headerBytes}`)
  }
  if (flags !== 0) {
    throw new Error(`Unsupported MakeHuman proxy flags 0x${flags.toString(16)}`)
  }
  if (sourceCount === 0 || renderCount === 0 || indexCount === 0) {
    throw new Error('Invalid MakeHuman proxy asset: vertex and index counts must be non-zero')
  }

  const refsBytes = checkedBytes(sourceCount, 3, 'reference')
  const weightsBytes = checkedBytes(sourceCount, 3, 'weight')
  const offsetsBytes = checkedBytes(sourceCount, 3, 'offset')
  const renderSourcesBytes = checkedBytes(renderCount, 1, 'render source')
  const uvBytes = checkedBytes(renderCount, 2, 'UV')
  const indicesBytes = checkedBytes(indexCount, 1, 'index')
  const expectedBytes = MHPX_HEADER_BYTES
    + refsBytes
    + weightsBytes
    + offsetsBytes
    + renderSourcesBytes
    + uvBytes
    + indicesBytes

  if (!Number.isSafeInteger(expectedBytes) || expectedBytes !== buffer.byteLength) {
    throw new Error(
      `Invalid MakeHuman proxy asset length: expected ${expectedBytes} bytes, received ${buffer.byteLength}`,
    )
  }

  const scaleRefs = new Uint32Array(SCALE_REF_COUNT)
  const scaleDenoms = new Float32Array(SCALE_AXIS_COUNT)
  for (let index = 0; index < SCALE_REF_COUNT; index += 1) {
    scaleRefs[index] = header.getUint32(24 + index * UINT_BYTES, true)
  }
  for (let axis = 0; axis < SCALE_AXIS_COUNT; axis += 1) {
    const denominator = header.getFloat32(48 + axis * FLOAT_BYTES, true)
    if (!Number.isFinite(denominator) || denominator <= 0) {
      throw new Error(`Invalid MakeHuman proxy asset: scale denominator ${axis} must be positive`)
    }
    scaleDenoms[axis] = denominator
  }

  let cursor = MHPX_HEADER_BYTES
  const take = (ArrayType, length) => {
    const values = new ArrayType(buffer, cursor, length).slice()
    cursor += values.byteLength
    return values
  }

  const refs = take(Uint32Array, sourceCount * 3)
  const weights = take(Float32Array, sourceCount * 3)
  const offsets = take(Float32Array, sourceCount * 3)
  const renderSources = take(Uint32Array, renderCount)
  const uvs = take(Float32Array, renderCount * 2)
  const indices = take(Uint32Array, indexCount)

  assertFiniteArray(weights, 'weights')
  assertFiniteArray(offsets, 'offsets')
  assertFiniteArray(uvs, 'uvs')
  assertIndexRange(renderSources, sourceCount, 'renderSources')
  assertIndexRange(indices, renderCount, 'indices')

  return {
    version,
    sourceCount,
    renderCount,
    indexCount,
    scaleRefs,
    scaleDenoms,
    refs,
    weights,
    offsets,
    renderSources,
    uvs,
    indices,
  }
}

function requireArrayLength(values, expectedLength, label) {
  if (!values || values.length !== expectedLength) {
    throw new Error(
      `Invalid MakeHuman proxy: ${label} must contain ${expectedLength} values`,
    )
  }
}

/**
 * Fit an MHPX proxy to a morphed MakeHuman position buffer.
 *
 * Source proxy vertices are calculated from three weighted human references and
 * an axis-scaled offset. The returned buffer is expanded into render-vertex
 * order through renderSources so it aligns with proxy.uvs and proxy.indices.
 */
export function fitProxyPositions(proxy, fitPositions) {
  if (!proxy || !Number.isInteger(proxy.sourceCount) || !Number.isInteger(proxy.renderCount)) {
    throw new TypeError('A parsed MakeHuman proxy is required')
  }
  const positionsAreArrayLike = Array.isArray(fitPositions) || ArrayBuffer.isView(fitPositions)
  if (!positionsAreArrayLike || !Number.isInteger(fitPositions.length) || fitPositions.length % 3 !== 0) {
    throw new TypeError('fitPositions must be a flat xyz position array')
  }

  requireArrayLength(proxy.scaleRefs, SCALE_REF_COUNT, 'scaleRefs')
  requireArrayLength(proxy.scaleDenoms, SCALE_AXIS_COUNT, 'scaleDenoms')
  requireArrayLength(proxy.refs, proxy.sourceCount * 3, 'refs')
  requireArrayLength(proxy.weights, proxy.sourceCount * 3, 'weights')
  requireArrayLength(proxy.offsets, proxy.sourceCount * 3, 'offsets')
  requireArrayLength(proxy.renderSources, proxy.renderCount, 'renderSources')

  const fitVertexCount = fitPositions.length / 3
  assertIndexRange(proxy.scaleRefs, fitVertexCount, 'scaleRefs')
  assertIndexRange(proxy.refs, fitVertexCount, 'refs')
  assertIndexRange(proxy.renderSources, proxy.sourceCount, 'renderSources')
  assertFiniteArray(proxy.scaleDenoms, 'scaleDenoms')
  assertFiniteArray(proxy.weights, 'weights')
  assertFiniteArray(proxy.offsets, 'offsets')

  const axisScales = new Float64Array(SCALE_AXIS_COUNT)
  for (let axis = 0; axis < SCALE_AXIS_COUNT; axis += 1) {
    const denominator = proxy.scaleDenoms[axis]
    if (denominator <= 0) {
      throw new Error(`Invalid MakeHuman proxy: scale denominator ${axis} must be positive`)
    }
    const referenceA = proxy.scaleRefs[axis * 2] * 3 + axis
    const referenceB = proxy.scaleRefs[axis * 2 + 1] * 3 + axis
    const coordinateA = Number(fitPositions[referenceA])
    const coordinateB = Number(fitPositions[referenceB])
    if (!Number.isFinite(coordinateA) || !Number.isFinite(coordinateB)) {
      throw new Error(`Invalid fitPositions: scale reference for axis ${axis} is not finite`)
    }
    axisScales[axis] = Math.abs(coordinateB - coordinateA) / denominator
  }

  const sourcePositions = new Float32Array(proxy.sourceCount * 3)
  for (let source = 0; source < proxy.sourceCount; source += 1) {
    const sourceOffset = source * 3
    for (let axis = 0; axis < SCALE_AXIS_COUNT; axis += 1) {
      let coordinate = 0
      for (let influence = 0; influence < 3; influence += 1) {
        const referenceIndex = proxy.refs[sourceOffset + influence] * 3 + axis
        const referenceCoordinate = Number(fitPositions[referenceIndex])
        if (!Number.isFinite(referenceCoordinate)) {
          throw new Error(
            `Invalid fitPositions: referenced coordinate for source ${source} is not finite`,
          )
        }
        coordinate += referenceCoordinate * proxy.weights[sourceOffset + influence]
      }
      sourcePositions[sourceOffset + axis] = coordinate
        + proxy.offsets[sourceOffset + axis] * axisScales[axis]
    }
  }

  const renderPositions = new Float32Array(proxy.renderCount * 3)
  for (let render = 0; render < proxy.renderCount; render += 1) {
    const sourceOffset = proxy.renderSources[render] * 3
    const renderOffset = render * 3
    renderPositions[renderOffset] = sourcePositions[sourceOffset]
    renderPositions[renderOffset + 1] = sourcePositions[sourceOffset + 1]
    renderPositions[renderOffset + 2] = sourcePositions[sourceOffset + 2]
  }
  return renderPositions
}

export class MHProxyLoader extends THREE.Loader {
  parse(data) {
    return parseMHProxy(data)
  }

  load(url, onLoad, onProgress, onError) {
    const loader = new THREE.FileLoader(this.manager)
    loader.setPath(this.path)
    loader.setResponseType('arraybuffer')
    loader.setRequestHeader(this.requestHeader)
    loader.setWithCredentials(this.withCredentials)

    return loader.load(url, (data) => {
      try {
        onLoad?.(this.parse(data))
      } catch (error) {
        if (onError) onError(error)
        else console.error(error)
        this.manager.itemError(url)
      }
    }, onProgress, onError)
  }
}
