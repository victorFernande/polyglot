import assert from 'node:assert/strict'
import test from 'node:test'

import {
  eligibleLetterBlockWords,
  generateLetterBlocksPuzzle,
  letterBlocksSeed,
  updateFoundLetterBlockWords,
  validateLetterBlocksPath,
} from './letterBlocks.mjs'

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
  { id: 10, answer: { value: 'Superkalifragilistischexpialigetisch' } },
  { id: 11, answer: { value: ['Apfel'] } },
]

test('eligibleLetterBlockWords keeps unique short single-token answer words for a compact local game', () => {
  assert.deepEqual(eligibleLetterBlockWords(lessonItems, 8), ['HAUS', 'BUCH', 'WASSER', 'KATZE', 'GEHEN', '東京', 'APFEL'])
})

test('eligibleLetterBlockWords rejects repeated, multi-token, non-scalar, too-short, and too-long answers', () => {
  const items = [
    { answer: { value: 'a' } },
    { answer: { value: 'au' } },
    { answer: { value: 'a b' } },
    { answer: { value: ['eins', 'zwei'] } },
    { answer: { value: { nested: 'Wort' } } },
    { answer: { value: 'überschallgeschwindigkeit' } },
  ]

  assert.deepEqual(eligibleLetterBlockWords(items), [])
})

test('generateLetterBlocksPuzzle deterministically creates a compact grid where every target word has a 4-way adjacent path', () => {
  const words = ['HAUS', 'BUCH', 'WASSER', 'KATZE', 'GEHEN']
  const first = generateLetterBlocksPuzzle(words, 'lesson-1:session-2')
  const second = generateLetterBlocksPuzzle(words, 'lesson-1:session-2')

  assert.deepEqual(first, second)
  assert.equal(first.grid.length, 5)
  assert.equal(first.grid.every((row) => row.length === 5), true)

  for (const word of words) {
    const path = first.paths[word]
    assert.ok(path, `expected path for ${word}`)
    assert.equal(path.length, Array.from(word).length)
    assert.equal(path.every((point, index) => first.grid[point.row][point.col] === Array.from(word)[index]), true)
    for (let index = 1; index < path.length; index += 1) {
      const distance = Math.abs(path[index].row - path[index - 1].row) + Math.abs(path[index].col - path[index - 1].col)
      assert.equal(distance, 1, `${word} step ${index} should be horizontally/vertically adjacent`)
    }
  }
})

test('validateLetterBlocksPath accepts only exact 4-way adjacent target paths', () => {
  const puzzle = generateLetterBlocksPuzzle(['WASSER', 'KATZE', 'GEHEN'], 'selection-seed')
  const wasserPath = puzzle.paths.WASSER

  assert.deepEqual(validateLetterBlocksPath({ grid: puzzle.grid, targets: puzzle.targets, path: wasserPath }), { found: true, word: 'WASSER' })
  assert.deepEqual(validateLetterBlocksPath({ grid: puzzle.grid, targets: puzzle.targets, path: wasserPath.toReversed() }), { found: false, word: null, reason: 'not-target' })
  assert.deepEqual(validateLetterBlocksPath({ grid: puzzle.grid, targets: puzzle.targets, path: [wasserPath[0], { row: wasserPath[0].row + 1, col: wasserPath[0].col + 1 }] }), { found: false, word: null, reason: 'not-adjacent' })
  assert.deepEqual(validateLetterBlocksPath({ grid: puzzle.grid, targets: puzzle.targets, path: [wasserPath[0], wasserPath[0]] }), { found: false, word: null, reason: 'reused-cell' })
})

test('updateFoundLetterBlockWords adds only new validated words to local state', () => {
  assert.deepEqual(updateFoundLetterBlockWords(['HAUS'], { found: true, word: 'BUCH' }), ['HAUS', 'BUCH'])
  assert.deepEqual(updateFoundLetterBlockWords(['HAUS'], { found: true, word: 'HAUS' }), ['HAUS'])
  assert.deepEqual(updateFoundLetterBlockWords(['HAUS'], { found: false, word: null }), ['HAUS'])
})

test('letterBlocksSeed stays stable for lesson/session context and changes across active windows', () => {
  assert.equal(letterBlocksSeed({ lesson: { id: 'de-food' }, session: { id: 's3' }, currentIndex: 4 }), 'de-food:s3:4')
  assert.notEqual(
    letterBlocksSeed({ lesson: { id: 'de-food' }, session: { id: 's3' }, currentIndex: 4 }),
    letterBlocksSeed({ lesson: { id: 'de-food' }, session: { id: 's3' }, currentIndex: 5 }),
  )
})
