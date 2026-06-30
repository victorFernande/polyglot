import assert from 'node:assert/strict'
import test from 'node:test'

import {
  eligibleWordSearchWords,
  generateWordSearchGrid,
  validateWordSearchSelection,
  updateFoundWordSearchWords,
  wordSearchSeed,
} from './wordSearch.mjs'

const lessonItems = [
  { id: 1, answer: { value: 'Haus' } },
  { id: 2, answer: { value: 'Buch' } },
  { id: 3, answer: { value: 'Wasser' } },
  { id: 4, answer: { value: 'Katze' } },
  { id: 5, answer: { value: 'gehen' } },
  { id: 6, answer: { value: '東京' } },
  { id: 7, answer: { value: ['zu', 'kurz'] } },
  { id: 8, answer: { value: 'Haus' } },
  { id: 9, answer: { value: 'guten Morgen' } },
  { id: 10, answer: { value: '  ' } },
  { id: 11, answer: { value: ['Apfel'] } },
]

test('eligibleWordSearchWords keeps unique single-token answer words with unicode characters', () => {
  assert.deepEqual(eligibleWordSearchWords(lessonItems, 8), ['HAUS', 'BUCH', 'WASSER', 'KATZE', 'GEHEN', '東京', 'APFEL'])
})

test('eligibleWordSearchWords rejects terms that would make a tiny local puzzle noisy', () => {
  const items = [
    { answer: { value: 'a' } },
    { answer: { value: 'au' } },
    { answer: { value: 'a b' } },
    { answer: { value: ['eins', 'zwei'] } },
    { answer: { value: { nested: 'Wort' } } },
  ]

  assert.deepEqual(eligibleWordSearchWords(items), [])
})

test('generateWordSearchGrid places every target word deterministically without mutating the input words', () => {
  const words = ['HAUS', 'BUCH', 'WASSER', 'KATZE', 'GEHEN', '東京']
  const first = generateWordSearchGrid(words, 'lesson-1:session-2')
  const second = generateWordSearchGrid(words, 'lesson-1:session-2')

  assert.deepEqual(first.grid, second.grid)
  assert.deepEqual(first.placements, second.placements)
  assert.deepEqual(words, ['HAUS', 'BUCH', 'WASSER', 'KATZE', 'GEHEN', '東京'])
  assert.equal(first.grid.length, 10)
  assert.equal(first.grid.every((row) => row.length === 10), true)
  for (const word of words) {
    assert.ok(first.placements[word], `expected placement for ${word}`)
  }
})

test('validateWordSearchSelection accepts forward and reverse straight-line selections only', () => {
  const puzzle = generateWordSearchGrid(['WASSER', 'KATZE', 'GEHEN', 'HAUS', 'BUCH', '東京'], 'selection-seed')
  const placement = puzzle.placements.WASSER
  const forward = validateWordSearchSelection({ placements: puzzle.placements, from: placement.start, to: placement.end })
  const reverse = validateWordSearchSelection({ placements: puzzle.placements, from: placement.end, to: placement.start })

  assert.deepEqual(forward, { found: true, word: 'WASSER' })
  assert.deepEqual(reverse, { found: true, word: 'WASSER' })
  assert.deepEqual(validateWordSearchSelection({ placements: puzzle.placements, from: placement.start, to: { row: placement.start.row + 1, col: placement.start.col + 2 } }), { found: false, word: null })
})

test('updateFoundWordSearchWords adds only newly validated words to local state', () => {
  assert.deepEqual(updateFoundWordSearchWords(['HAUS'], { found: true, word: 'BUCH' }), ['HAUS', 'BUCH'])
  assert.deepEqual(updateFoundWordSearchWords(['HAUS'], { found: true, word: 'HAUS' }), ['HAUS'])
  assert.deepEqual(updateFoundWordSearchWords(['HAUS'], { found: false, word: null }), ['HAUS'])
})

test('wordSearchSeed stays stable for lesson/session context and changes across active windows', () => {
  assert.equal(wordSearchSeed({ lesson: { id: 'de-food' }, session: { id: 's3' }, currentIndex: 4 }), 'de-food:s3:4')
  assert.notEqual(
    wordSearchSeed({ lesson: { id: 'de-food' }, session: { id: 's3' }, currentIndex: 4 }),
    wordSearchSeed({ lesson: { id: 'de-food' }, session: { id: 's3' }, currentIndex: 5 }),
  )
})
