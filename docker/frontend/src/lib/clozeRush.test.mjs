import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildClozeRushQueue,
  clozeRushPrompt,
  extractClozeRushAnswerText,
  validateClozeRushSelection,
} from './clozeRush.mjs'

const sessionItems = [
  { id: 1, prompt: 'Monte: Eu bebo água.', answer: { value: ['Ich', 'trinke', 'Wasser'] }, explanation: 'trinke concorda com ich.' },
  { id: 2, prompt: 'Escolha “bom dia”.', answer: { value: 'Guten Morgen' }, explanation: 'Cumprimento matinal.' },
  { id: 3, prompt: 'Escolha a imagem que representa “das Wort Buch” (das Wort Buch)', answer: { value: 'das Wort Buch' }, explanation: 'Buch significa livro.' },
  { id: 4, prompt: 'Combine os pares.', answer: { pairs: [['Haus', 'casa']] } },
  { id: 5, prompt: 'Japonês sem tokens confiáveis.', answer: { value: 'おはよう' } },
]

test('extractClozeRushAnswerText accepts strings and token arrays but skips unsupported answer shapes', () => {
  assert.equal(extractClozeRushAnswerText({ value: 'Guten Morgen' }), 'Guten Morgen')
  assert.equal(extractClozeRushAnswerText({ value: ['Ich', 'trinke', 'Wasser'] }), 'Ich trinke Wasser')
  assert.equal(extractClozeRushAnswerText({ pairs: [['Haus', 'casa']] }), '')
})

test('buildClozeRushQueue creates deterministic local cloze cards with one hidden token and selectable chips', () => {
  const queue = buildClozeRushQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's2' }, currentIndex: 0 })

  assert.equal(queue.length, 3)
  const first = queue.find((card) => card.id === 1)
  assert.equal(first.fullText, 'Ich trinke Wasser')
  assert.match(first.clozeText, /____/)
  assert.equal(first.chips.includes(first.missingToken), true)
  assert.equal(first.chips.length >= 3, true)
  assert.equal(new Set(first.chips).size, first.chips.length)
  assert.equal(first.explanation, 'trinke concorda com ich.')
  assert.equal(first.prompt, 'Monte: Eu bebo água.')

  const repeated = buildClozeRushQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's2' }, currentIndex: 0 })
  assert.deepEqual(queue, repeated)
})

test('buildClozeRushQueue uses answer token arrays for Japanese instead of splitting text character by character', () => {
  const jpQueue = buildClozeRushQueue([
    { id: 'jp-array', prompt: 'Monte a saudação.', answer: { value: ['おはよう', 'ございます'] } },
    { id: 'jp-string', prompt: 'Escolha a saudação.', answer: { value: 'おはよう' } },
    { id: 'jp-other', prompt: 'Monte agradecimento.', answer: { value: ['ありがとう', 'ございます'] } },
  ], { lesson: { id: 'jp-1' }, session: { id: 's1' }, currentIndex: 0 })

  assert.deepEqual(jpQueue.map((card) => card.id).sort(), ['jp-array', 'jp-other'])
  assert.equal(jpQueue.every((card) => !card.clozeText.includes('お____')), true)
})

test('clozeRushPrompt strips trailing parenthesized target-answer leaks only', () => {
  assert.equal(clozeRushPrompt('Escolha a imagem que representa “das Wort Buch” (das Wort Buch)', 'das Wort Buch'), 'Escolha a imagem que representa “das Wort Buch”')
  assert.equal(clozeRushPrompt('Use artigo definido (masculino)', 'der Mann'), 'Use artigo definido (masculino)')
})

test('validateClozeRushSelection checks only the hidden token and returns the full answer for feedback', () => {
  const card = buildClozeRushQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's2' }, currentIndex: 0 })[0]

  assert.deepEqual(validateClozeRushSelection(card.missingToken, card), { status: 'correct', expected: card.missingToken, fullText: card.fullText })
  assert.deepEqual(validateClozeRushSelection('Katze', card), { status: 'wrong', expected: card.missingToken, fullText: card.fullText })
})
