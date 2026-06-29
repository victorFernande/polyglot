import assert from 'node:assert/strict'
import test from 'node:test'

import { addFlashcardToReviewQueue, getFlashcardReviewKey, mergeFlashcardsWithReviewQueue } from './flashcardReviewQueue.mjs'

const cards = [
  { id: 'a', front: 'eins', back: 'one' },
  { id: 'b', front: 'zwei', back: 'two' },
  { id: 'c', front: 'drei', back: 'three' },
]

test('addFlashcardToReviewQueue appends a missed card without mutating the current queue', () => {
  const queue = [cards[0]]

  const nextQueue = addFlashcardToReviewQueue(queue, cards[1])

  assert.notEqual(nextQueue, queue)
  assert.deepEqual(queue.map((card) => card.id), ['a'])
  assert.deepEqual(nextQueue.map((card) => card.id), ['a', 'b'])
})

test('addFlashcardToReviewQueue avoids duplicate missed cards by stable card id', () => {
  const queue = [cards[1]]

  const nextQueue = addFlashcardToReviewQueue(queue, { ...cards[1], back: '2' })

  assert.deepEqual(nextQueue.map((card) => card.id), ['b'])
})

test('mergeFlashcardsWithReviewQueue keeps the original deck first and reviews missed cards once at the end', () => {
  const deckWithReviews = mergeFlashcardsWithReviewQueue(cards, [cards[2], cards[0], cards[2]])

  assert.deepEqual(deckWithReviews.map((card) => card.id), ['a', 'b', 'c', 'c', 'a'])
  assert.deepEqual(cards.map((card) => card.id), ['a', 'b', 'c'])
})

test('getFlashcardReviewKey falls back to card content when an API card has no id', () => {
  assert.equal(
    getFlashcardReviewKey({ language: 'de', front: 'Guten Morgen', back: 'Good morning' }),
    'de|Guten Morgen|Good morning',
  )
})
