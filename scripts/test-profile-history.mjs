import assert from 'node:assert/strict'
import {
  commitProfileCheckpoint,
  profileSnapshot,
  redoProfileHistory,
  undoProfileHistory,
} from '../src/lib/profileHistory.js'

const makeProfile = (value) => profileSnapshot({ waist: value }, { arms: value }, { hairStyle: `style-${value}` })
const first = makeProfile(1)
const second = makeProfile(2)
const third = makeProfile(3)

let history = { past: [], future: [] }
history = commitProfileCheckpoint(history, first)
history = commitProfileCheckpoint(history, first)
assert.deepEqual(history, { past: [first], future: [] }, 'one gesture checkpoint must not duplicate')

const undone = undoProfileHistory(history, second)
assert.deepEqual(undone.profile, first)
assert.deepEqual(undone.history, { past: [], future: [second] })

const redone = redoProfileHistory(undone.history, first)
assert.deepEqual(redone.profile, second)
assert.deepEqual(redone.history, { past: [first], future: [] })

const branched = commitProfileCheckpoint(undone.history, third)
assert.deepEqual(branched, { past: [third], future: [] }, 'a real edit after undo must clear redo')

let bounded = { past: [], future: [] }
for (let index = 0; index < 40; index += 1) bounded = commitProfileCheckpoint(bounded, makeProfile(index))
assert.equal(bounded.past.length, 32)
assert.deepEqual(bounded.past[0], makeProfile(8))

process.stdout.write('Profile history passed: gesture dedupe, undo, redo, branch clearing, and bounded retention.\n')
