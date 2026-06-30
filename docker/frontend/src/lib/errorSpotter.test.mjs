import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildErrorSpotterQueue,
  errorSpotterSeed,
  validateErrorSpotterSelection,
} from './errorSpotter.mjs'

const buildItems = [
  {
    id: 'de-build-1',
    type: 'build',
    prompt: 'Monte: Eu bebo água.',
    answer: { value: ['Ich', 'trinke', 'Wasser'] },
    tiles: ['Ich', 'trinke', 'Wasser', 'Milch', 'Brot'],
  },
  {
    id: 'de-build-2',
    type: 'listen_build',
    prompt: 'Ouça e monte a frase.',
    answer: { value: ['Sie', 'isst', 'Brot'] },
    tiles: ['Sie', 'isst', 'Brot', 'Wasser', 'Apfel'],
  },
  {
    id: 'de-build-3',
    type: 'build',
    prompt: 'Monte: Nós vamos para casa.',
    answer: { value: ['Wir', 'gehen', 'nach', 'Hause'] },
    tiles: ['Wir', 'gehen', 'nach', 'Hause', 'trinken', 'Katze'],
  },
  {
    id: 'duplicate-answer',
    type: 'build',
    prompt: 'Duplicado não deve repetir cartão.',
    answer: { value: ['Ich', 'trinke', 'Wasser'] },
    tiles: ['Ich', 'trinke', 'Wasser', 'Tee'],
  },
  {
    id: 'choice-ignored',
    type: 'multiple_choice',
    answer: { value: ['Nicht', 'eligible'] },
    tiles: ['Nicht', 'eligible', 'falsch'],
  },
]

test('buildErrorSpotterQueue creates local intruder cards from build-like session items', () => {
  const queue = buildErrorSpotterQueue(buildItems, {
    lesson: { id: 'de-food' },
    session: { id: 's3' },
    currentIndex: 0,
  })

  assert.equal(queue.length, 3)
  assert.equal(new Set(queue.map((card) => card.correctText)).size, 3)
  assert.equal(queue.every((card) => card.id && card.seed && card.intruder && card.correctToken), true)

  for (const card of queue) {
    assert.notDeepEqual(card.spottedTokens, card.correctTokens)
    assert.equal(card.spottedTokens.length, card.correctTokens.length)
    assert.equal(card.spottedTokens[card.intruderIndex], card.intruder)
    assert.equal(card.correctTokens[card.intruderIndex], card.correctToken)
    assert.equal(card.correctText, card.correctTokens.join(' '))
  }
})

test('buildErrorSpotterQueue requires at least three eligible unique cards', () => {
  assert.deepEqual(buildErrorSpotterQueue(buildItems.slice(0, 2), { lesson: { id: 'de-food' }, session: { id: 's3' } }), [])
  assert.deepEqual(
    buildErrorSpotterQueue([
      { id: 'no-distractor', type: 'build', answer: { value: ['Ich', 'lerne'] }, tiles: ['Ich', 'lerne'] },
      { id: 'string-answer', type: 'build', answer: { value: 'Ich lerne' }, tiles: ['Ich', 'lerne', 'du'] },
      { id: 'one-token', type: 'build', answer: { value: ['Hallo'] }, tiles: ['Hallo', 'Tschüss'] },
    ], { lesson: { id: 'de-food' }, session: { id: 's3' } }),
    [],
  )
})

test('errorSpotterSeed stays stable for lesson session context and changes across active windows', () => {
  assert.equal(errorSpotterSeed({ lesson: { id: 'de-food' }, session: { id: 's3' }, currentIndex: 4 }), 'de-food:s3:4')
  assert.notEqual(
    errorSpotterSeed({ lesson: { id: 'de-food' }, session: { id: 's3' }, currentIndex: 4 }),
    errorSpotterSeed({ lesson: { id: 'de-food' }, session: { id: 's3' }, currentIndex: 5 }),
  )
})

test('validateErrorSpotterSelection returns learner feedback without mutating progress state', () => {
  const [card] = buildErrorSpotterQueue(buildItems, { lesson: { id: 'de-food' }, session: { id: 's3' }, currentIndex: 0 })

  assert.deepEqual(validateErrorSpotterSelection(card.intruder, card), {
    status: 'correct',
    intruder: card.intruder,
    correctToken: card.correctToken,
    correctText: card.correctText,
  })
  assert.deepEqual(validateErrorSpotterSelection(card.correctToken, card), {
    status: 'wrong',
    intruder: card.intruder,
    correctToken: card.correctToken,
    correctText: card.correctText,
  })
})
