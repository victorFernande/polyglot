import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOrthographyRepairQueue,
  damageOrthographyRepairText,
  normalizeOrthographyRepairWords,
  validateOrthographyRepairAnswer,
} from './orthographyRepair.mjs'

const sessionItems = [
  { id: 1, type: 'choice', prompt: 'Traduza: Bom dia.', answer: { value: 'Guten Morgen!' } },
  { id: 2, type: 'build', prompt: 'Monte: Eu bebo água.', answer: { value: ['Ich', 'trinke', 'Wasser.'] } },
  { id: 3, type: 'choice', prompt: 'Acentos franceses.', answer: { value: 'École française.' } },
  { id: 4, type: 'match', prompt: 'Combine.', answer: { pairs: [['Haus', 'casa']] } },
  { id: 5, type: 'choice', prompt: 'Muito curto', answer: { value: 'ja' } },
  { id: 6, type: 'choice', prompt: 'Longo demais', answer: { value: 'eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn' } },
]

test('damageOrthographyRepairText lowercases text normalizes spacing and removes final punctuation', () => {
  assert.equal(damageOrthographyRepairText('  Guten   Morgen! '), 'guten morgen')
  assert.equal(damageOrthographyRepairText('École française.'), 'école française')
  assert.equal(damageOrthographyRepairText('これは ペン です。'), 'これは ペン です')
})

test('validateOrthographyRepairAnswer separates exact from capitalization punctuation near misses', () => {
  assert.deepEqual(validateOrthographyRepairAnswer('Guten Morgen!', 'Guten Morgen!'), { status: 'correct', expected: 'Guten Morgen!' })
  assert.deepEqual(validateOrthographyRepairAnswer('guten morgen', 'Guten Morgen!'), { status: 'close', expected: 'Guten Morgen!' })
  assert.deepEqual(validateOrthographyRepairAnswer('Guten Morgen', 'Guten Morgen!'), { status: 'close', expected: 'Guten Morgen!' })
})

test('validateOrthographyRepairAnswer rejects changed words and missing diacritics', () => {
  assert.deepEqual(validateOrthographyRepairAnswer('Guten Abend!', 'Guten Morgen!'), { status: 'wrong', expected: 'Guten Morgen!' })
  assert.deepEqual(validateOrthographyRepairAnswer('Ecole francaise.', 'École française.'), { status: 'wrong', expected: 'École française.' })
})

test('normalizeOrthographyRepairWords preserves diacritics while ignoring case punctuation and spacing', () => {
  assert.equal(normalizeOrthographyRepairWords(' École,   française! '), 'école française')
  assert.notEqual(normalizeOrthographyRepairWords('Ecole francaise!'), normalizeOrthographyRepairWords('École française!'))
})

test('buildOrthographyRepairQueue keeps eligible textual answers and creates damaged prompts', () => {
  const queue = buildOrthographyRepairQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's2' }, currentIndex: 0 })

  assert.deepEqual(queue.map((card) => card.answer), ['Guten Morgen!', 'Ich trinke Wasser.', 'École française.'])
  assert.deepEqual(queue.map((card) => card.damaged), ['guten morgen', 'ich trinke wasser', 'école française'])
  assert.equal(queue.every((card) => card.id && card.seed && card.prompt), true)
})

test('buildOrthographyRepairQueue rotates deterministically by current index without needing progress APIs', () => {
  const first = buildOrthographyRepairQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's2' }, currentIndex: 0 })
  const rotated = buildOrthographyRepairQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's2' }, currentIndex: 1 })

  assert.deepEqual(rotated.map((card) => card.id), first.slice(1).concat(first.slice(0, 1)).map((card) => card.id))
})
