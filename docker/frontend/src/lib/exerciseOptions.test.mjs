import assert from 'node:assert/strict'
import test from 'node:test'

import { stableShuffleOptions } from './exerciseOptions.mjs'

test('stableShuffleOptions keeps all options but moves the first answer for a known exercise seed', () => {
  const options = ['correct', 'wrong A', 'wrong B', 'wrong C']

  const shuffled = stableShuffleOptions(options, 'exercise-42')

  assert.deepEqual([...shuffled].sort(), [...options].sort())
  assert.notEqual(shuffled[0], 'correct')
})

test('stableShuffleOptions returns the same order for the same seed without mutating input', () => {
  const options = ['ja', 'nein', 'bitte', 'danke']

  const first = stableShuffleOptions(options, 'de-choice-7')
  const second = stableShuffleOptions(options, 'de-choice-7')

  assert.deepEqual(first, second)
  assert.deepEqual(options, ['ja', 'nein', 'bitte', 'danke'])
})

test('stableShuffleOptions can produce different orders for different seeds', () => {
  const options = ['un', 'deux', 'trois', 'quatre']

  assert.notDeepEqual(stableShuffleOptions(options, 'fr-1'), stableShuffleOptions(options, 'fr-2'))
})
