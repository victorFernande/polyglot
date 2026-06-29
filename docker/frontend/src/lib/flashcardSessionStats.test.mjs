import assert from 'node:assert/strict'
import test from 'node:test'

import { getFlashcardSessionStats } from './flashcardSessionStats.mjs'

test('getFlashcardSessionStats reports studied review queue and remaining counts for the visible deck', () => {
  assert.deepEqual(
    getFlashcardSessionStats({ deckCount: 10, reviewQueueCount: 2, currentIndex: 3 }),
    {
      studiedCount: 4,
      reviewQueueCount: 2,
      remainingCount: 8,
    },
  )
})

test('getFlashcardSessionStats starts empty decks at zero without negative remaining cards', () => {
  assert.deepEqual(
    getFlashcardSessionStats({ deckCount: 0, reviewQueueCount: 0, currentIndex: 0 }),
    {
      studiedCount: 0,
      reviewQueueCount: 0,
      remainingCount: 0,
    },
  )
})

test('getFlashcardSessionStats clamps an out-of-range index to the visible deck length', () => {
  assert.deepEqual(
    getFlashcardSessionStats({ deckCount: 3, reviewQueueCount: 1, currentIndex: 99 }),
    {
      studiedCount: 4,
      reviewQueueCount: 1,
      remainingCount: 0,
    },
  )
})
