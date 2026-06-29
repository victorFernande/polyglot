import assert from 'node:assert/strict'
import test from 'node:test'

import { getFlashcardMicroGoalState, getFlashcardReviewJumpState, getFlashcardSessionStats } from './flashcardSessionStats.mjs'

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


test('getFlashcardSessionStats reports studied review queue and remaining counts for the visible deck', () => {
  assert.deepEqual(
    getFlashcardSessionStats({ deckCount: 10, reviewQueueCount: 2, currentIndex: 3 }),
    {
      studiedCount: 4,
      reviewQueueCount: 2,
      remainingCount: 8,
      isComplete: false,
    },
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
