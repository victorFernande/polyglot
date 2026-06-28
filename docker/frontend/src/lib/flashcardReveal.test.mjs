import assert from 'node:assert/strict'
import test from 'node:test'

import { getFlashcardSupportVisibility } from './flashcardReveal.mjs'

test('flashcard hint and explanation stay hidden on the front side', () => {
  assert.deepEqual(getFlashcardSupportVisibility({ flipped: false }), {
    hint: false,
    explanation: false,
  })
})

test('flashcard hint and explanation are visible on the back side', () => {
  assert.deepEqual(getFlashcardSupportVisibility({ flipped: true }), {
    hint: true,
    explanation: true,
  })
})
