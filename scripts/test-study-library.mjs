import assert from 'node:assert/strict'
import { INITIAL_MEASUREMENTS, INITIAL_POSE } from '../src/data/anatomy.js'
import { DEFAULT_APPEARANCE } from '../src/data/appearance.js'
import { MAX_STUDIES, addStudy, readStudyLibrary, removeStudy } from '../src/lib/studyLibrary.js'

const base = {
  measurements: INITIAL_MEASUREMENTS,
  pose: INITIAL_POSE,
  appearance: DEFAULT_APPEARANCE,
}

const first = addStudy([], base, 'Baseline', 100)
assert.equal(first.studies.length, 1)
assert.equal(first.added.name, 'Baseline')

const duplicate = addStudy(first.studies, base, 'Duplicate', 101)
assert.equal(duplicate.studies.length, 1)
assert.equal(duplicate.duplicate.id, first.added.id)

let studies = first.studies
for (let index = 0; index < MAX_STUDIES + 2; index += 1) {
  studies = addStudy(studies, {
    ...base,
    measurements: { ...base.measurements, height: 155 + index },
  }, `Variation ${index}`, 200 + index).studies
}
assert.equal(studies.length, MAX_STUDIES)

const recovered = readStudyLibrary(JSON.stringify([
  { id: 'valid', name: '  Saved fit  ', createdAt: 42, profile: base },
  { id: 'invalid', profile: null },
]))
assert.equal(recovered.length, 1)
assert.equal(recovered[0].name, 'Saved fit')
assert.deepEqual(readStudyLibrary('{broken'), [])
assert.equal(removeStudy(recovered, 'valid').length, 0)

console.log('Study library tests passed')
