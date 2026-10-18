import assert from 'node:assert/strict'
import { createLatestWorkerQueue } from '../src/lib/latestWorkerQueue.js'

const sent = []
const accepted = []
const errors = []
const queue = createLatestWorkerQueue({
  send: (job) => sent.push(job),
  onResult: (message) => accepted.push(message.value),
  onError: (error) => errors.push(error),
})

queue.enqueue({ value: 'before-ready' })
queue.enqueue({ value: 'latest-before-ready' })
assert.equal(sent.length, 0)
queue.markReady()
assert.deepEqual(sent.map(({ value }) => value), ['latest-before-ready'])

queue.enqueue({ value: 'superseded-a' })
queue.enqueue({ value: 'latest-b' })
const firstRequest = sent[0].requestId
assert.equal(queue.resolve({ type: 'result', requestId: firstRequest, value: 'stale' }), true)
assert.deepEqual(accepted, [], 'a completed job must be discarded when a newer job is pending')
assert.deepEqual(sent.map(({ value }) => value), ['latest-before-ready', 'latest-b'])

const latestRequest = sent[1].requestId
assert.equal(queue.resolve({ type: 'result', requestId: firstRequest, value: 'late-duplicate' }), false)
assert.equal(queue.resolve({ type: 'result', requestId: latestRequest, value: 'fresh' }), true)
assert.deepEqual(accepted, ['fresh'])
assert.deepEqual(errors, [])

queue.close()
assert.equal(queue.enqueue({ value: 'ignored' }), null)
assert.equal(sent.length, 2)

process.stdout.write('Latest-only worker queue passed: coalescing, stale rejection, ordering, and close semantics.\n')
