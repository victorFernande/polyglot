import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildChunkBuilderQueue,
  chunkBuilderCanSubmit,
  chunksToText,
  validateChunkBuilderAnswer,
} from './chunkBuilder.mjs'

const sessionItems = [
  { id: 'a', type: 'choice', prompt: 'Como dizer que eu quero um café?', answer: { value: 'Ich möchte einen Kaffee bitte.' } },
  { id: 'b', type: 'build', prompt: 'Monte: eu bebo água.', answer: { value: ['Ich', 'trinke', 'Wasser'] } },
  { id: 'c', type: 'choice', prompt: 'Frase curta demais.', answer: { value: 'Danke' } },
  { id: 'd', type: 'choice', prompt: 'Duplicado normalizado.', answer: { value: ' Ich  möchte einen Kaffee bitte. ' } },
  { id: 'e', type: 'choice', prompt: 'Preserva kana.', answer: { value: '私は 東京 に 住んでいます。' } },
]

test('buildChunkBuilderQueue creates deterministic phrase-chunk cards from eligible session answers', () => {
  const first = buildChunkBuilderQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's1' }, currentIndex: 2 })
  const second = buildChunkBuilderQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's1' }, currentIndex: 2 })

  assert.deepEqual(first, second)
  assert.deepEqual(first.map((card) => card.answer), [
    'Ich möchte einen Kaffee bitte.',
    'Ich trinke Wasser',
    '私は 東京 に 住んでいます。',
  ])
  assert.deepEqual(first[0].chunks, ['Ich möchte', 'einen Kaffee', 'bitte.'])
  assert.notDeepEqual(first[0].shuffledChunks, first[0].chunks)
  assert.equal(first.every((card) => card.prompt && card.seed && card.chunks.length >= 2), true)
})

test('buildChunkBuilderQueue requires phrase-like answers and keeps accents/scripts/punctuation', () => {
  const queue = buildChunkBuilderQueue([
    { id: 'fr', prompt: 'Peça um café.', answer: { value: 'Je voudrais un café, s’il vous plaît.' } },
    { id: 'ru', prompt: 'Diga onde você mora.', answer: { value: 'Я живу в Москве.' } },
    { id: 'short', prompt: 'Curto.', answer: { value: 'Oui' } },
  ])

  assert.deepEqual(queue.map((card) => chunksToText(card.chunks)), [
    'Je voudrais un café, s’il vous plaît.',
    'Я живу в Москве.',
  ])
})

test('validateChunkBuilderAnswer checks exact chunk order with only whitespace normalization', () => {
  const expectedChunks = ['Ich möchte', 'einen Kaffee', 'bitte.']

  assert.equal(chunkBuilderCanSubmit(['Ich möchte', 'einen Kaffee', 'bitte.'], expectedChunks), true)
  assert.deepEqual(validateChunkBuilderAnswer(['Ich möchte', 'einen Kaffee', 'bitte.'], expectedChunks), {
    status: 'correct',
    expected: 'Ich möchte einen Kaffee bitte.',
  })
  assert.deepEqual(validateChunkBuilderAnswer(['einen Kaffee', 'Ich möchte', 'bitte.'], expectedChunks), {
    status: 'wrong',
    expected: 'Ich möchte einen Kaffee bitte.',
  })
  assert.deepEqual(validateChunkBuilderAnswer(['Ich mochte', 'einen Kaffee', 'bitte.'], expectedChunks), {
    status: 'wrong',
    expected: 'Ich möchte einen Kaffee bitte.',
  })
})
