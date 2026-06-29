import assert from 'node:assert/strict'
import test from 'node:test'

import { cleanExercisePrompt, sessionWindowForPage } from './exerciseTrailLayout.mjs'

test('cleanExercisePrompt removes verbose unit and topic prefix from the question', () => {
  assert.equal(
    cleanExercisePrompt('Unidade 1/10 — Fazendo um pedido no café · Tópico 9/10 — confirmar pedido: como dizer “mais um café”?'),
    'como dizer “mais um café”?',
  )
})

test('cleanExercisePrompt keeps already clean prompts unchanged', () => {
  assert.equal(cleanExercisePrompt('como dizer “olá” em Alemão?'), 'como dizer “olá” em Alemão?')
})

test('sessionWindowForPage shows exactly one line of ten sessions and arrow state', () => {
  const nodes = Array.from({ length: 25 }, (_, index) => ({ number: index + 1 }))

  assert.deepEqual(sessionWindowForPage(nodes, 0), {
    page: 0,
    start: 0,
    end: 10,
    visibleNodes: nodes.slice(0, 10),
    canGoPrev: false,
    canGoNext: true,
  })
  assert.deepEqual(sessionWindowForPage(nodes, 1), {
    page: 1,
    start: 10,
    end: 20,
    visibleNodes: nodes.slice(10, 20),
    canGoPrev: true,
    canGoNext: true,
  })
  assert.deepEqual(sessionWindowForPage(nodes, 2), {
    page: 2,
    start: 20,
    end: 25,
    visibleNodes: nodes.slice(20, 25),
    canGoPrev: true,
    canGoNext: false,
  })
})

test('sessionWindowForPage clamps invalid pages to the available range', () => {
  const nodes = Array.from({ length: 12 }, (_, index) => ({ number: index + 1 }))

  assert.equal(sessionWindowForPage(nodes, -1).page, 0)
  assert.equal(sessionWindowForPage(nodes, 99).page, 1)
})
