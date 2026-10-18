/**
 * A tiny latest-only scheduler for expensive workers. At most one job is in
 * flight; rapid input replaces the pending job instead of building a queue of
 * obsolete body morphs.
 */
export function createLatestWorkerQueue({ send, onResult, onError }) {
  let ready = false
  let closed = false
  let busy = false
  let sequence = 0
  let inFlight = null
  let pending = null

  const pump = () => {
    if (!ready || closed || busy || !pending) return
    inFlight = pending
    pending = null
    busy = true
    send(inFlight)
  }

  return {
    enqueue(payload) {
      if (closed) return null
      pending = { ...payload, requestId: ++sequence }
      pump()
      return pending?.requestId || inFlight?.requestId || sequence
    },
    markReady() {
      ready = true
      pump()
    },
    resolve(message) {
      if (closed || !busy || message?.requestId !== inFlight?.requestId) return false
      busy = false
      inFlight = null
      if (pending) pump()
      else if (message.type === 'result') onResult(message)
      else onError(message)
      return true
    },
    fail(error) {
      if (closed) return
      busy = false
      inFlight = null
      pending = null
      onError(error)
    },
    close() {
      closed = true
      pending = null
      inFlight = null
      busy = false
    },
    snapshot() {
      return { ready, closed, busy, pendingRequestId: pending?.requestId || null, inFlightRequestId: inFlight?.requestId || null }
    },
  }
}
