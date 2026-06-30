import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAudioBingoQueue, extractAudioBingoPhrases, validateAudioBingoSelection } from './audioBingo.mjs'

const items = [
  { id: 'one', prompt: 'Escolha “Guten Morgen”', answer: { value: 'Guten Morgen' } },
  { id: 'two', answer: { value: 'Ich komme aus Brasilien.' } },
  { id: 'three', answer: ['Ich', 'wohne', 'in', 'Berlin'] },
  { id: 'four', answer: { value: 'Guten Abend' } },
  { id: 'five', answer: { value: 'Bis später' } },
  { id: 'six', answer: { value: 'Danke schön' } },
  { id: 'seven', answer: { value: 'Bitte sehr' } },
  { id: 'eight', answer: { value: 'Wie geht es dir?' } },
  { id: 'nine', answer: { value: 'Ich heiße Ana.' } },
  { id: 'ten', answer: { value: 'Ich spreche Deutsch.' } },
  { id: 'dupe-case', answer: { value: ' guten morgen ' } },
  { id: 'empty', answer: { value: '   ' } },
]

test('extractAudioBingoPhrases returns unique target-language session answers', () => {
  assert.deepEqual(extractAudioBingoPhrases(items), [
    'Guten Morgen',
    'Ich komme aus Brasilien.',
    'Ich wohne in Berlin',
    'Guten Abend',
    'Bis später',
    'Danke schön',
    'Bitte sehr',
    'Wie geht es dir?',
    'Ich heiße Ana.',
    'Ich spreche Deutsch.',
  ])
})

test('buildAudioBingoQueue requires at least six unique phrases', () => {
  assert.deepEqual(buildAudioBingoQueue(items.slice(0, 5), { lesson: { id: 'de-u1' }, session: { id: 's1' } }), [])
})

test('buildAudioBingoQueue creates deterministic 3x3 listening cards that include the target', () => {
  const context = { lesson: { id: 'de-u1' }, session: { id: 'session-7' }, currentIndex: 2 }
  const queue = buildAudioBingoQueue(items, context)

  assert.equal(queue.length, 8)
  assert.deepEqual(queue, buildAudioBingoQueue(items, context))

  for (const card of queue) {
    assert.ok(card.grid.length >= 6)
    assert.ok(card.grid.length <= 9)
    assert.ok(card.grid.some((option) => option.key === card.targetKey && option.text === card.targetText))
    assert.equal(new Set(card.grid.map((option) => option.text.normalize('NFC').toLocaleLowerCase())).size, card.grid.length)
    assert.doesNotMatch(card.grid.map((option) => option.text).join(' '), /Escolha|Resposta|Traduza|Portugu[eê]s/i)
  }
})

test('validateAudioBingoSelection normalizes the selected card text against the heard target', () => {
  const card = buildAudioBingoQueue(items, { lesson: { id: 'de-u1' }, session: { id: 's1' } })[0]
  const correctOption = card.grid.find((option) => option.key === card.targetKey)
  const wrongOption = card.grid.find((option) => option.key !== card.targetKey)

  assert.deepEqual(validateAudioBingoSelection(correctOption.key, card), {
    status: 'correct',
    expected: card.targetText,
    selected: correctOption.text,
  })
  assert.deepEqual(validateAudioBingoSelection(wrongOption.key, card), {
    status: 'wrong',
    expected: card.targetText,
    selected: wrongOption.text,
  })
  assert.deepEqual(validateAudioBingoSelection('', card), {
    status: 'wrong',
    expected: card.targetText,
    selected: '',
  })
})
