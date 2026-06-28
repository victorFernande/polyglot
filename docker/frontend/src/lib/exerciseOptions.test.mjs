import assert from 'node:assert/strict'
import test from 'node:test'

import { buildTilesForItem, matchRightOptions, stableShuffleOptions } from './exerciseOptions.mjs'

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

test('buildTilesForItem derives stable shuffled tiles from the answer when tiles are absent', () => {
  const item = { id: 'build-99', answer: ['ich', 'bin', 'bereit'] }

  const first = buildTilesForItem(item)
  const second = buildTilesForItem(item)

  assert.deepEqual(first, second)
  assert.deepEqual([...first].sort(), ['bereit', 'bin', 'ich'])
  assert.notDeepEqual(first, item.answer)
})

test('buildTilesForItem preserves provided tiles without mutating them', () => {
  const item = { id: 'build-tiles', answer: ['ignored'], tiles: ['pronto', 'estou', 'eu'] }

  const tiles = buildTilesForItem(item)

  assert.deepEqual(tiles, ['pronto', 'estou', 'eu'])
  assert.notEqual(tiles, item.tiles)
})

test('matchRightOptions shuffles right-hand choices independently from pair order', () => {
  const pairs = [['eu', 'I'], ['você', 'you'], ['nós', 'we'], ['eles', 'they']]

  const rights = matchRightOptions({ id: 'match-12', pairs })

  assert.deepEqual([...rights].sort(), ['I', 'they', 'we', 'you'])
  assert.notDeepEqual(rights, ['I', 'you', 'we', 'they'])
  assert.deepEqual(rights, matchRightOptions({ id: 'match-12', pairs }))
})
