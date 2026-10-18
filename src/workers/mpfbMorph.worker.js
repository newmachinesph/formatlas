import { loadMpfb, morphMpfb, reposeMpfb } from '../lib/mpfb.js'
import { measurementInputSignature } from '../lib/morphSignature.js'

let assetsPromise = null
const resultCache = new Map()
const neutralCache = new Map()
const CACHE_LIMIT = 6
const NEUTRAL_CACHE_LIMIT = 4

function poseSignature(pose) {
  return `${Number(pose?.arms) || 0}|${Number(pose?.stance) || 0}`
}

function cacheKey(measurements, pose) {
  return `${measurementInputSignature(measurements)}|${poseSignature(pose)}`
}

function remember(key, result) {
  if (resultCache.has(key)) resultCache.delete(key)
  resultCache.set(key, result)
  while (resultCache.size > CACHE_LIMIT) resultCache.delete(resultCache.keys().next().value)
  return result
}

function rememberNeutral(key, result) {
  if (neutralCache.has(key)) neutralCache.delete(key)
  neutralCache.set(key, result)
  while (neutralCache.size > NEUTRAL_CACHE_LIMIT) neutralCache.delete(neutralCache.keys().next().value)
  return result
}

function morphCached(assets, measurements, pose) {
  const key = cacheKey(measurements, pose)
  const cached = resultCache.get(key)
  if (cached) {
    resultCache.delete(key)
    resultCache.set(key, cached)
    return cached
  }
  const neutralKey = measurementInputSignature(measurements)
  const prepared = neutralCache.get(neutralKey)
  if (prepared) {
    neutralCache.delete(neutralKey)
    neutralCache.set(neutralKey, prepared)
  }
  const result = prepared
    ? reposeMpfb(assets, measurements, pose, prepared)
    : morphMpfb(assets, measurements, pose)
  rememberNeutral(neutralKey, result)
  return remember(key, result)
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error || 'Unknown morph worker error')
}

self.addEventListener('message', async (event) => {
  const message = event.data
  if (message?.type === 'initialize') {
    try {
      assetsPromise ||= loadMpfb(message.manifestUrl)
      await assetsPromise
      self.postMessage({ type: 'ready' })
    } catch (error) {
      self.postMessage({ type: 'fatal', error: errorMessage(error) })
    }
    return
  }

  if (message?.type !== 'morph') return
  try {
    const assets = await assetsPromise
    if (!assets) throw new Error('The morph worker was not initialized')
    const active = morphCached(assets, message.measurements, message.pose)
    const reference = message.compareEnabled && message.comparisonMeasurements
      ? morphCached(assets, message.comparisonMeasurements, message.pose)
      : null
    self.postMessage({
      type: 'result',
      requestId: message.requestId,
      active,
      reference,
      measurements: message.measurements,
      comparisonMeasurements: message.compareEnabled ? message.comparisonMeasurements : null,
    })
  } catch (error) {
    self.postMessage({ type: 'error', requestId: message.requestId, error: errorMessage(error) })
  }
})
