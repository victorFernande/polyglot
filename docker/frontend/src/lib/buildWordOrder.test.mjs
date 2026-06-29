import assert from 'node:assert/strict'
import test from 'node:test'

import { moveBuiltWord } from './buildWordOrder.mjs'

test('moveBuiltWord moves a selected word left without losing the selection', () => {
  assert.deepEqual(moveBuiltWord(['Ich', 'Kaffee', 'möchte'], 1, -1), ['Kaffee', 'Ich', 'möchte'])
})

test('moveBuiltWord moves a selected word right without losing the selection', () => {
  assert.deepEqual(moveBuiltWord(['Ich', 'Kaffee', 'möchte'], 1, 1), ['Ich', 'möchte', 'Kaffee'])
})

test('moveBuiltWord keeps boundary and invalid moves unchanged', () => {
  assert.deepEqual(moveBuiltWord(['Ich', 'möchte'], 0, -1), ['Ich', 'möchte'])
  assert.deepEqual(moveBuiltWord(['Ich', 'möchte'], 1, 1), ['Ich', 'möchte'])
  assert.deepEqual(moveBuiltWord(['Ich', 'möchte'], 5, -1), ['Ich', 'möchte'])
})
