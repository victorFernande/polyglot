import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildTypingRushQueue,
  normalizeTypingRushAnswer,
  typingRushPrompt,
  validateTypingRushAnswer,
} from './typingRush.mjs'

const sessionItems = [
  { id: 1, type: 'choice', prompt: 'Escolha “casa”.', answer: { value: 'Haus' } },
  { id: 2, type: 'build', prompt: 'Monte: Eu bebo água.', answer: { value: ['Ich', 'trinke', 'Wasser'] } },
  { id: 3, type: 'match', prompt: 'Combine os pares.', answer: { pairs: [['Haus', 'casa']] } },
  { id: 4, type: 'choice', prompt: 'Longo demais', answer: { value: 'eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn' } },
  { id: 5, type: 'choice', prompt: 'Em branco', answer: { value: '   ' } },
]

test('buildTypingRushQueue keeps only short simple target-language answers and preserves prompts', () => {
  const queue = buildTypingRushQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's2' }, currentIndex: 0 })

  assert.deepEqual(queue.map((card) => card.answer), ['Haus', 'Ich trinke Wasser'])
  assert.deepEqual(queue.map((card) => card.prompt), ['Escolha “casa”.', 'Monte: Eu bebo água.'])
  assert.equal(queue.every((card) => card.id && card.seed), true)
})

test('buildTypingRushQueue orders cards deterministically from lesson session and current index', () => {
  const first = buildTypingRushQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's2' }, currentIndex: 0 })
  const second = buildTypingRushQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's2' }, currentIndex: 0 })
  const changed = buildTypingRushQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's2' }, currentIndex: 1 })

  assert.deepEqual(first, second)
  assert.notDeepEqual(first.map((card) => card.id), changed.map((card) => card.id))
})

test('normalizeTypingRushAnswer ignores case punctuation and repeated spaces', () => {
  assert.equal(normalizeTypingRushAnswer('  Ich   trinke Wasser! '), 'ich trinke wasser')
  assert.equal(normalizeTypingRushAnswer('École, garçon.'), 'école garçon')
})

test('validateTypingRushAnswer accepts normalized exact answers only', () => {
  assert.deepEqual(validateTypingRushAnswer(' haus ', 'Haus'), { status: 'correct', expected: 'Haus' })
  assert.deepEqual(validateTypingRushAnswer('hause', 'Haus'), { status: 'close', expected: 'Haus' })
  assert.deepEqual(validateTypingRushAnswer('Katze', 'Haus'), { status: 'wrong', expected: 'Haus' })
})

test('typingRushPrompt strips target answer leaks from visible local prompt', () => {
  assert.equal(typingRushPrompt('Escolha a imagem que representa “das Wort Buch” (das Wort Buch)', 'das Wort Buch'), 'Escolha a imagem que representa “das Wort Buch”')
  assert.equal(typingRushPrompt('Use artigo definido (masculino)', 'der Mann'), 'Use artigo definido (masculino)')
})
