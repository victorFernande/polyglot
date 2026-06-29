import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { cleanExercisePrompt, sessionWindowForPage, trailHeaderLayoutClasses } from './exerciseTrailLayout.mjs'

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

test('trailHeaderLayoutClasses stacks context and separates 3-item mobile from 10-item desktop trail layouts', () => {
  const classes = trailHeaderLayoutClasses()

  assert.match(classes.wrapper, /space-y-5/)
  assert.doesNotMatch(classes.wrapper, /lg:grid-cols/)
  assert.match(classes.contextCard, /w-full/)
  assert.match(classes.mobileTrail, /lg:hidden/)
  assert.doesNotMatch(classes.mobileTrail, /sm:hidden/)
  assert.match(classes.mobileTrailNodes, /grid-cols-3/)
  assert.match(classes.mobileTrailNodes, /min-w-0/)
  assert.doesNotMatch(classes.mobileTrailNodes, /min-w-\[/)
  assert.match(classes.desktopTrail, /hidden/)
  assert.match(classes.desktopTrail, /lg:flex/)
  assert.doesNotMatch(classes.desktopTrail, /sm:flex/)
  assert.match(classes.desktopTrailNodes, /min-w-0/)
  assert.doesNotMatch(classes.desktopTrailNodes, /min-w-\[720px\]/)
})

test('sessionWindowForPage can paginate mobile trail as groups of three sessions', () => {
  const nodes = Array.from({ length: 10 }, (_, index) => ({ number: index + 1 }))

  assert.deepEqual(sessionWindowForPage(nodes, 0, 3).visibleNodes, nodes.slice(0, 3))
  assert.deepEqual(sessionWindowForPage(nodes, 1, 3).visibleNodes, nodes.slice(3, 6))
  assert.deepEqual(sessionWindowForPage(nodes, 3, 3).visibleNodes, nodes.slice(9, 10))
})

test('Tailwind scans mjs helpers that provide exercise trail classes', () => {
  const config = readFileSync(new URL('../../tailwind.config.js', import.meta.url), 'utf8')

  assert.match(config, /mjs/)
})
