import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMemoryMatchCards, memoryMatchSelection, isMemoryMatchPair } from './memoryMatch.mjs'

const pairs = [
  ['Haus', 'casa'],
  ['Buch', 'livro'],
  ['Wasser', 'água'],
]

test('buildMemoryMatchCards creates one left and one right card for each pair', () => {
  const cards = buildMemoryMatchCards(pairs, 'lesson-1')

  assert.equal(cards.length, pairs.length * 2)
  for (const [index, [left, right]] of pairs.entries()) {
    const pairCards = cards.filter((card) => card.pairKey === `pair-${index}`)
    assert.equal(pairCards.length, 2)
    assert.deepEqual(pairCards.map((card) => card.side).sort(), ['left', 'right'])
    assert.equal(pairCards.find((card) => card.side === 'left').value, left)
    assert.equal(pairCards.find((card) => card.side === 'right').value, right)
  }
})

test('buildMemoryMatchCards shuffles cards deterministically for the same seed', () => {
  const first = buildMemoryMatchCards(pairs, 'stable-seed').map((card) => card.id)
  const second = buildMemoryMatchCards(pairs, 'stable-seed').map((card) => card.id)

  assert.deepEqual(first, second)
})

test('buildMemoryMatchCards changes order when the seed changes', () => {
  const first = buildMemoryMatchCards(pairs, 'seed-a').map((card) => card.id)
  const second = buildMemoryMatchCards(pairs, 'seed-b').map((card) => card.id)

  assert.notDeepEqual(first, second)
})

test('isMemoryMatchPair accepts only cards from opposite sides of the same pair', () => {
  const cards = buildMemoryMatchCards(pairs, 'lesson-1')
  const leftHouse = cards.find((card) => card.side === 'left' && card.value === 'Haus')
  const rightHouse = cards.find((card) => card.side === 'right' && card.value === 'casa')
  const rightBook = cards.find((card) => card.side === 'right' && card.value === 'livro')
  const leftBook = cards.find((card) => card.side === 'left' && card.value === 'Buch')

  assert.equal(isMemoryMatchPair(leftHouse, rightHouse), true)
  assert.equal(isMemoryMatchPair(leftHouse, rightBook), false)
  assert.equal(isMemoryMatchPair(leftHouse, leftBook), false)
  assert.equal(isMemoryMatchPair(leftHouse, null), false)
})

test('memoryMatchSelection records correct pairs in the existing match payload shape', () => {
  const cards = buildMemoryMatchCards(pairs, 'lesson-1')
  const leftHouse = cards.find((card) => card.side === 'left' && card.value === 'Haus')
  const rightHouse = cards.find((card) => card.side === 'right' && card.value === 'casa')
  const rightBook = cards.find((card) => card.side === 'right' && card.value === 'livro')

  assert.deepEqual(memoryMatchSelection({ selectedCards: [rightHouse, leftHouse], matched: {} }), {
    matched: { Haus: 'casa' },
    shouldClearSelection: true,
    isPairFound: true,
  })
  assert.deepEqual(memoryMatchSelection({ selectedCards: [leftHouse, rightBook], matched: { Buch: 'livro' } }), {
    matched: { Buch: 'livro' },
    shouldClearSelection: true,
    isPairFound: false,
  })
})
