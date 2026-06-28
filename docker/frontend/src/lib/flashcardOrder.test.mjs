import assert from 'node:assert/strict'
import test from 'node:test'

import { shuffleFlashcards } from './flashcardOrder.mjs'

const cards = [
  { id: 'a', front: 'eins' },
  { id: 'b', front: 'zwei' },
  { id: 'c', front: 'drei' },
  { id: 'd', front: 'vier' },
]

test('shuffleFlashcards returns all cards once without mutating the API array', () => {
  const original = [...cards]

  const shuffled = shuffleFlashcards(cards, () => 0)

  assert.notEqual(shuffled, cards)
  assert.deepEqual(cards, original)
  assert.deepEqual(shuffled.map((card) => card.id).sort(), ['a', 'b', 'c', 'd'])
})

test('shuffleFlashcards can change the order with an injected random source', () => {
  const shuffled = shuffleFlashcards(cards, () => 0)

  assert.deepEqual(shuffled.map((card) => card.id), ['b', 'c', 'd', 'a'])
})

test('shuffleFlashcards preserves zero and one card decks', () => {
  assert.deepEqual(shuffleFlashcards([], () => 0.5), [])
  assert.deepEqual(shuffleFlashcards([cards[0]], () => 0.5), [cards[0]])
})
