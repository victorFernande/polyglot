import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAudioABQueue, extractAudioABPhrases, validateAudioABSelection } from './audioAB.mjs'

const items = [
  { id: 'one', prompt: 'Escolha “Guten Morgen”', answer: { value: 'Guten Morgen' } },
  { id: 'two', answer: { value: 'Ich komme aus Brasilien.' } },
  { id: 'three', answer: ['Ich', 'wohne', 'in', 'Berlin'] },
  { id: 'four', type: 'sequence_dialogue', answer: { value: ['Hallo!', 'Wie heißt du?', 'Ich heiße Ana.'] } },
  { id: 'dupe', answer: { value: 'Guten Morgen' } },
  { id: 'empty', answer: { value: '   ' } },
]

test('extractAudioABPhrases returns unique target-language phrases from session answers', () => {
  assert.deepEqual(extractAudioABPhrases(items), [
    'Guten Morgen',
    'Ich komme aus Brasilien.',
    'Ich wohne in Berlin',
    'Hallo!',
    'Wie heißt du?',
    'Ich heiße Ana.',
  ])
})

test('buildAudioABQueue creates deterministic A/B listening cards without leaking Portuguese options', () => {
  const queue = buildAudioABQueue(items, {
    lesson: { id: 'de-u1' },
    session: { id: 'session-7' },
    currentIndex: 2,
  })

  assert.equal(queue.length, 6)
  assert.deepEqual(queue, buildAudioABQueue(items, {
    lesson: { id: 'de-u1' },
    session: { id: 'session-7' },
    currentIndex: 2,
  }))

  for (const card of queue) {
    assert.equal(card.options.length, 2)
    assert.notEqual(card.options[0].text, card.options[1].text)
    assert.ok(card.options.some((option) => option.key === card.targetKey && option.text === card.targetText))
    assert.doesNotMatch(card.options.map((option) => option.text).join(' '), /Escolha|Resposta|Traduza|Portugu[eê]s/i)
  }
})

test('validateAudioABSelection checks selected option by stable key and returns heard phrase', () => {
  const card = buildAudioABQueue(items, { lesson: { id: 'de-u1' }, session: { id: 's1' } })[0]
  const wrong = card.options.find((option) => option.key !== card.targetKey)

  assert.deepEqual(validateAudioABSelection(card.targetKey, card), {
    status: 'correct',
    expected: card.targetText,
    selected: card.targetText,
  })
  assert.deepEqual(validateAudioABSelection(wrong.key, card), {
    status: 'wrong',
    expected: card.targetText,
    selected: wrong.text,
  })
})
