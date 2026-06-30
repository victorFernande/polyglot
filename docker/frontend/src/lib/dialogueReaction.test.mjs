import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDialogueReactionQueue,
  normalizeDialogueReactionAnswer,
  validateDialogueReactionSelection,
} from './dialogueReaction.mjs'

const sessionItems = [
  {
    id: 'ctx-1',
    type: 'context_choice',
    prompt: 'Unidade 1 — café: Pessoa: Guten Morgen!\nVocê: ___\nEscolha a melhor resposta.',
    answer: { value: 'Guten Morgen!' },
    options: ['Danke.', 'Guten Morgen!', 'Tschüss.'],
    explanation: 'A saudação responde naturalmente ao cumprimento.',
  },
  {
    id: 'ctx-2',
    type: 'context_choice',
    prompt: 'Pessoa: Bonjour, je voudrais un café.\nVocê: ___\nEscolha a resposta adequada.',
    answer: { value: 'Bien sûr.' },
    options: ['Au revoir.', 'Bien sûr.', 'Je suis un livre.'],
    hint: 'Responda ao pedido.',
  },
  {
    id: 'plain-choice',
    type: 'choice',
    prompt: 'Escolha a tradução.',
    answer: { value: 'Haus' },
    options: ['Haus', 'Brot'],
  },
  {
    id: 'bad-context',
    type: 'context_choice',
    prompt: 'Escolha a melhor resposta para esta situação.',
    answer: { value: 'Sim' },
    options: ['Sim', 'Não'],
  },
]

test('buildDialogueReactionQueue keeps only parseable context-choice dialogue cards', () => {
  const queue = buildDialogueReactionQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's3' }, currentIndex: 2 })

  assert.equal(queue.length, 2)
  assert.deepEqual(queue.map((card) => card.id), ['ctx-1', 'ctx-2'])
  assert.equal(queue[0].partnerLabel, 'Pessoa')
  assert.equal(queue[0].partnerText, 'Guten Morgen!')
  assert.equal(queue[0].learnerLabel, 'Você')
  assert.equal(queue[0].answer, 'Guten Morgen!')
  assert.equal(queue[0].explanation, 'A saudação responde naturalmente ao cumprimento.')
})

test('buildDialogueReactionQueue shuffles options deterministically by session context', () => {
  const first = buildDialogueReactionQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's3' }, currentIndex: 2 })
  const second = buildDialogueReactionQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's3' }, currentIndex: 2 })
  const third = buildDialogueReactionQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's3' }, currentIndex: 3 })

  assert.deepEqual(first, second)
  assert.deepEqual([...first[0].options].sort(), ['Danke.', 'Guten Morgen!', 'Tschüss.'].sort())
  assert.notDeepEqual(first[0].options, third[0].options)
})

test('validateDialogueReactionSelection normalizes whitespace and capitalization', () => {
  assert.equal(normalizeDialogueReactionAnswer('  GUTEN   MORGEN! '), 'guten morgen!')
  assert.deepEqual(validateDialogueReactionSelection(' guten morgen! ', { answer: 'Guten Morgen!' }), {
    status: 'correct',
    expected: 'Guten Morgen!',
  })
  assert.deepEqual(validateDialogueReactionSelection('Danke.', { answer: 'Guten Morgen!' }), {
    status: 'wrong',
    expected: 'Guten Morgen!',
  })
})

test('buildDialogueReactionQueue returns an empty queue when no microdialogues are available', () => {
  assert.deepEqual(buildDialogueReactionQueue(sessionItems.slice(2)), [])
})
