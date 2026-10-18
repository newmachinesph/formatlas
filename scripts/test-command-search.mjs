import assert from 'node:assert/strict'
import { searchCommands } from '../src/lib/commandSearch.js'

const commands = [
  { id: 'randomize', label: 'Randomize profile', category: 'Actions', keywords: 'generate body' },
  { id: 'bust', label: 'Breast & chest', category: 'Edit areas', keywords: 'bust torso' },
  { id: 'waist', label: 'Natural waist', category: 'Measurements', keywords: 'torso tape' },
  { id: 'front', label: 'Front view', category: 'Views', keywords: 'camera' },
]

assert.deepEqual(searchCommands(commands, '').map(({ id }) => id), ['randomize', 'bust', 'waist', 'front'])
assert.deepEqual(searchCommands(commands, 'bust').map(({ id }) => id), ['bust'])
assert.deepEqual(searchCommands(commands, 'measure waist').map(({ id }) => id), ['waist'])
assert.deepEqual(searchCommands(commands, 'camera').map(({ id }) => id), ['front'])
assert.deepEqual(searchCommands(commands, 'missing'), [])
assert.equal(searchCommands(commands, '', 2).length, 2)

process.stdout.write('Command search passed: ranking, token matching, keywords, empty state, and limits.\n')
