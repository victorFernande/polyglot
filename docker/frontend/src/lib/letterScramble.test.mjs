import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLetterScramblePayload,
  isLetterScrambleEligible,
  letterScrambleAnswer,
  stableScrambleLetters,
} from './letterScramble.mjs'

test('isLetterScrambleEligible accepts a build item with one short word answer', () => {
  const item = { type: 'build', answer: { value: ['Danke'] } }

  assert.equal(isLetterScrambleEligible(item), true)
})

test('isLetterScrambleEligible rejects multi-token and spaced answers', () => {
  assert.equal(isLetterScrambleEligible({ type: 'build', answer: { value: ['Ich', 'lerne'] } }), false)
  assert.equal(isLetterScrambleEligible({ type: 'listen_build', answer: { value: ['thank you'] } }), false)
})

test('stableScrambleLetters returns the same non-trivial order for the same seed', () => {
  const first = stableScrambleLetters('Danke', 'exercise-42')
  const second = stableScrambleLetters('Danke', 'exercise-42')

  assert.deepEqual(first, second)
  assert.deepEqual([...first].sort(), [...'Danke'].sort())
  assert.notDeepEqual(first, [...'Danke'])
})

test('letterScrambleAnswer joins selected letters into the single answer word', () => {
  assert.equal(letterScrambleAnswer(['D', 'a', 'n', 'k', 'e']), 'Danke')
})

test('buildLetterScramblePayload preserves backend build payload shape', () => {
  assert.deepEqual(buildLetterScramblePayload(['D', 'a', 'n', 'k', 'e']), ['Danke'])
})
