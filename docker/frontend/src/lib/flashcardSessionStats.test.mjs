import assert from 'node:assert/strict'
import test from 'node:test'

import { getFlashcardFocusState, getFlashcardMicroGoalState, getFlashcardRecallStats, getFlashcardReviewJumpState, getFlashcardSessionStats, recordFlashcardRecall } from './flashcardSessionStats.mjs'


test('getFlashcardFocusState stays neutral until enough cards were studied', () => {
  assert.deepEqual(
    getFlashcardFocusState({ studiedCount: 6, reviewQueueCount: 3 }),
    {
      studiedCount: 6,
      reviewQueueCount: 3,
      minimumStudiedCount: 10,
      reviewRate: 0.5,
      reviewPercent: 50,
      level: 'neutral',
      label: 'Aguardando dados',
      message: 'Estude mais alguns cards para gerar um resumo de foco.',
    },
  )
})

test('getFlashcardFocusState recommends the current rhythm for a low review rate', () => {
  assert.deepEqual(
    getFlashcardFocusState({ studiedCount: 10, reviewQueueCount: 1 }),
    {
      studiedCount: 10,
      reviewQueueCount: 1,
      minimumStudiedCount: 10,
      reviewRate: 0.1,
      reviewPercent: 10,
      level: 'low',
      label: 'Ritmo bom',
      message: 'Siga no ritmo atual; poucos cards ficaram marcados para revisão.',
    },
  )
})

test('getFlashcardFocusState recommends end-of-block review for a medium review rate', () => {
  assert.equal(
    getFlashcardFocusState({ studiedCount: 10, reviewQueueCount: 3 }).message,
    'Revise os cards marcados ao fim do bloco antes de avançar rápido demais.',
  )
  assert.equal(getFlashcardFocusState({ studiedCount: 10, reviewQueueCount: 3 }).level, 'medium')
  assert.equal(getFlashcardFocusState({ studiedCount: 10, reviewQueueCount: 3 }).reviewPercent, 30)
})

test('getFlashcardFocusState recommends slowing down for a high review rate', () => {
  assert.deepEqual(
    getFlashcardFocusState({ studiedCount: 12, reviewQueueCount: 7 }),
    {
      studiedCount: 12,
      reviewQueueCount: 7,
      minimumStudiedCount: 10,
      reviewRate: 7 / 12,
      reviewPercent: 58,
      level: 'high',
      label: 'Priorize revisão',
      message: 'Reduza a velocidade e priorize os cards marcados antes de continuar.',
    },
  )
})

test('getFlashcardFocusState clamps invalid counts before calculating the review rate', () => {
  assert.deepEqual(
    getFlashcardFocusState({ studiedCount: -4, reviewQueueCount: -2, minimumStudiedCount: 3 }),
    {
      studiedCount: 0,
      reviewQueueCount: 0,
      minimumStudiedCount: 3,
      reviewRate: 0,
      reviewPercent: 0,
      level: 'neutral',
      label: 'Aguardando dados',
      message: 'Estude mais alguns cards para gerar um resumo de foco.',
    },
  )
})


test('getFlashcardMicroGoalState reports progress toward the default ten-card quick goal', () => {
  assert.deepEqual(
    getFlashcardMicroGoalState({ studiedCount: 4 }),
    {
      studiedCount: 4,
      goalSize: 10,
      displayedCount: 4,
      remainingCount: 6,
      isComplete: false,
      label: 'Meta rápida: 4/10 cards',
      message: 'Faltam 6 cards para concluir a meta rápida.',
    },
  )
})

test('getFlashcardMicroGoalState caps display at the goal and marks completion', () => {
  assert.deepEqual(
    getFlashcardMicroGoalState({ studiedCount: 12 }),
    {
      studiedCount: 12,
      goalSize: 10,
      displayedCount: 10,
      remainingCount: 0,
      isComplete: true,
      label: 'Meta rápida: 10/10 cards',
      message: 'Meta rápida concluída.',
    },
  )
})

test('getFlashcardMicroGoalState supports smaller safe goals and clamps invalid progress', () => {
  assert.deepEqual(
    getFlashcardMicroGoalState({ studiedCount: -3, goalSize: 3 }),
    {
      studiedCount: 0,
      goalSize: 3,
      displayedCount: 0,
      remainingCount: 3,
      isComplete: false,
      label: 'Meta rápida: 0/3 cards',
      message: 'Faltam 3 cards para concluir a meta rápida.',
    },
  )
})


test('recordFlashcardRecall increments known and unknown local session counters', () => {
  assert.deepEqual(
    recordFlashcardRecall({ knownCount: 1, unknownCount: 2 }, 'known'),
    { knownCount: 2, unknownCount: 2 },
  )
  assert.deepEqual(
    recordFlashcardRecall({ knownCount: 1, unknownCount: 2 }, 'unknown'),
    { knownCount: 1, unknownCount: 3 },
  )
})

test('getFlashcardRecallStats reports recall rate from explicit local self assessments', () => {
  assert.deepEqual(
    getFlashcardRecallStats({ knownCount: 3, unknownCount: 1 }),
    {
      knownCount: 3,
      unknownCount: 1,
      answeredCount: 4,
      recallPercent: 75,
      recallLabel: 'Taxa de lembrança: 75%',
    },
  )
})

test('getFlashcardRecallStats keeps an unanswered local session at zero percent', () => {
  assert.deepEqual(
    getFlashcardRecallStats({ knownCount: 0, unknownCount: 0 }),
    {
      knownCount: 0,
      unknownCount: 0,
      answeredCount: 0,
      recallPercent: 0,
      recallLabel: 'Taxa de lembrança: 0%',
    },
  )
})

test('getFlashcardSessionStats reports studied review queue remaining and confidence counts for the visible deck', () => {
  assert.deepEqual(
    getFlashcardSessionStats({ deckCount: 10, reviewQueueCount: 2, currentIndex: 3 }),
    {
      studiedCount: 4,
      reviewQueueCount: 2,
      remainingCount: 8,
      isComplete: false,
      confidencePercent: 50,
      confidenceLabel: 'Continue revisando os marcados',
    },
  )
})

test('getFlashcardSessionStats reports full confidence when no studied cards were marked', () => {
  assert.equal(
    getFlashcardSessionStats({ deckCount: 10, reviewQueueCount: 0, currentIndex: 4 }).confidencePercent,
    100,
  )
  assert.equal(
    getFlashcardSessionStats({ deckCount: 10, reviewQueueCount: 0, currentIndex: 4 }).confidenceLabel,
    'Boa retenção nesta rodada',
  )
})

test('getFlashcardSessionStats reports zero confidence when every studied card was marked', () => {
  assert.equal(
    getFlashcardSessionStats({ deckCount: 10, reviewQueueCount: 3, currentIndex: 2 }).confidencePercent,
    0,
  )
  assert.equal(
    getFlashcardSessionStats({ deckCount: 10, reviewQueueCount: 3, currentIndex: 2 }).confidenceLabel,
    'Sessão boa para reforço',
  )
})

test('getFlashcardSessionStats keeps confidence neutral before any cards are studied', () => {
  assert.equal(
    getFlashcardSessionStats({ deckCount: 0, reviewQueueCount: 0, currentIndex: 0 }).confidencePercent,
    0,
  )
  assert.equal(
    getFlashcardSessionStats({ deckCount: 0, reviewQueueCount: 0, currentIndex: 0 }).confidenceLabel,
    'Comece a estudar para medir confiança',
  )
})

test('getFlashcardSessionStats starts empty decks at zero without negative remaining cards', () => {
  assert.deepEqual(
    getFlashcardSessionStats({ deckCount: 0, reviewQueueCount: 0, currentIndex: 0 }),
    {
      studiedCount: 0,
      reviewQueueCount: 0,
      remainingCount: 0,
      isComplete: false,
      confidencePercent: 0,
      confidenceLabel: 'Comece a estudar para medir confiança',
    },
  )
})

test('getFlashcardSessionStats clamps an out-of-range index to the visible deck length', () => {
  assert.deepEqual(
    getFlashcardSessionStats({ deckCount: 3, reviewQueueCount: 1, currentIndex: 99 }),
    {
      studiedCount: 4,
      reviewQueueCount: 1,
      remainingCount: 0,
      isComplete: true,
      confidencePercent: 75,
      confidenceLabel: 'Continue revisando os marcados',
    },
  )
})

test('getFlashcardSessionStats marks non-empty sessions complete only after the final visible card', () => {
  assert.equal(
    getFlashcardSessionStats({ deckCount: 3, reviewQueueCount: 1, currentIndex: 2 }).isComplete,
    false,
  )
  assert.equal(
    getFlashcardSessionStats({ deckCount: 3, reviewQueueCount: 1, currentIndex: 3 }).isComplete,
    true,
  )
  assert.equal(
    getFlashcardSessionStats({ deckCount: 0, reviewQueueCount: 0, currentIndex: 0 }).isComplete,
    false,
  )
})

test('getFlashcardReviewJumpState enables jumping from the main deck to the first marked card', () => {
  assert.deepEqual(
    getFlashcardReviewJumpState({ deckCount: 10, reviewQueueCount: 2, currentIndex: 4 }),
    {
      canJumpToReviewQueue: true,
      reviewQueueStartIndex: 10,
    },
  )
})

test('getFlashcardReviewJumpState disables jumping without marked cards or while already reviewing', () => {
  assert.deepEqual(
    getFlashcardReviewJumpState({ deckCount: 10, reviewQueueCount: 0, currentIndex: 4 }),
    {
      canJumpToReviewQueue: false,
      reviewQueueStartIndex: 10,
    },
  )
  assert.deepEqual(
    getFlashcardReviewJumpState({ deckCount: 10, reviewQueueCount: 2, currentIndex: 10 }),
    {
      canJumpToReviewQueue: false,
      reviewQueueStartIndex: 10,
    },
  )
})
