import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { cleanExercisePrompt, isTrailSessionEnabled, sessionWindowForPage, trailConnectorStateClasses, trailHeaderLayoutClasses, trailNodeStateClasses } from './exerciseTrailLayout.mjs'

test('cleanExercisePrompt removes verbose unit and topic prefix from the question', () => {
  assert.equal(
    cleanExercisePrompt('Unidade 1/10 — Fazendo um pedido no café · Tópico 9/10 — confirmar pedido: como dizer “mais um café”?'),
    'como dizer “mais um café”?',
  )
})

test('cleanExercisePrompt keeps already clean prompts unchanged', () => {
  assert.equal(cleanExercisePrompt('como dizer “olá” em Alemão?'), 'como dizer “olá” em Alemão?')
})

test('cleanExercisePrompt removes parenthesized target answer from visible image-choice prompts', () => {
  assert.equal(
    cleanExercisePrompt(
      'escolha a imagem/frase que representa “a palavra livro” (das Wort Buch)',
      { value: 'das Wort Buch' },
    ),
    'escolha a imagem/frase que representa “a palavra livro”',
  )
})

test('cleanExercisePrompt keeps explanatory parentheses that are not the answer', () => {
  assert.equal(
    cleanExercisePrompt('escolha a imagem correta (atenção ao contexto)', { value: 'das Buch' }),
    'escolha a imagem correta (atenção ao contexto)',
  )
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
  assert.match(classes.mobileTrailNodes, /flex/)
  assert.match(classes.mobileTrailNodes, /min-w-0/)
  assert.doesNotMatch(classes.mobileTrailNodes, /grid-cols/)
  assert.doesNotMatch(classes.mobileTrailNodes, /min-w-\[/)
  assert.match(classes.mobileConnector, /h-1/)
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

test('active trail session stays enabled even if path progress is temporarily stale', () => {
  assert.equal(isTrailSessionEnabled({ number: 11 }, 9, 11), true)
  assert.equal(isTrailSessionEnabled({ number: 11 }, 9, 10), false)
  assert.equal(isTrailSessionEnabled({ number: 10 }, 9, 10), true)
})

test('active trail node uses a stable highlight, not a loading animation', () => {
  const classes = trailNodeStateClasses({ status: 'current' }, true)

  assert.match(classes, /ring-2/)
  assert.doesNotMatch(classes, /animate-pulse/)
})

test('connector from active session to next session uses a deliberately slow loading-bar animation', () => {
  const classes = trailConnectorStateClasses({ number: 11, status: 'current' }, { number: 12, status: 'locked' }, 11)

  assert.match(classes, /bg-\[length:200%_100%\]/)
  assert.match(classes, /animate-shimmer-slow/)
  assert.doesNotMatch(classes, /animate-shimmer(\s|$)/)
  assert.match(classes, /from-polyglot-accent/)
  assert.doesNotMatch(classes, /bg-white\/15/)
})

test('connectors behind completed sessions stay solid green', () => {
  const classes = trailConnectorStateClasses({ number: 10, status: 'completed' }, { number: 11, status: 'current' }, 11)

  assert.equal(classes, 'bg-polyglot-green')
})

test('Exercises page imports trail helpers used by the rendered trail', () => {
  const source = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')
  const importLine = source.split('\n').find((line) => line.includes("../lib/exerciseTrailLayout.mjs")) || ''

  assert.match(importLine, /isTrailSessionEnabled/)
  assert.match(importLine, /trailNodeStateClasses/)
})

test('mobile trail nodes render only the inner marker and label, without card button wrapper', () => {
  const source = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')
  const mobileStart = source.indexOf('function renderMobileNode')
  const mobileEnd = source.indexOf('\n\n  return (', mobileStart)
  const mobileNode = source.slice(mobileStart, mobileEnd)

  assert.notEqual(mobileStart, -1)
  assert.notEqual(mobileEnd, -1)
  assert.doesNotMatch(mobileNode, /rounded-2xl border border-white\/10 bg-white\/5 p-2/)
  assert.match(mobileNode, /trailNodeStateClasses/)
  assert.match(mobileNode, /S\{node\.number\}/)
})

test('Tailwind scans mjs helpers that provide exercise trail classes', () => {
  const config = readFileSync(new URL('../../tailwind.config.js', import.meta.url), 'utf8')

  assert.match(config, /mjs/)
})

test('slow trail connector animation lasts twenty five seconds', () => {
  const config = readFileSync(new URL('../../tailwind.config.js', import.meta.url), 'utf8')

  assert.match(config, /'shimmer-slow': 'shimmer 25s linear infinite'/)
})
