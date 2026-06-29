import assert from 'node:assert/strict'
import { exerciseSessionProgress } from './exerciseSessionProgress.mjs'

assert.deepEqual(
  exerciseSessionProgress({ current_index: 0, total_count: 10, correct_count: 0, xp_earned: 0 }),
  {
    answered: 0,
    total: 10,
    remaining: 10,
    correct: 0,
    accuracyPercent: 0,
    xpEarned: 0,
  },
  'initial sessions should show zero answered, all questions remaining, and 0% accuracy'
)

assert.deepEqual(
  exerciseSessionProgress({ current_index: 4, total_count: 10, correct_count: 3, xp_earned: 30 }),
  {
    answered: 4,
    total: 10,
    remaining: 6,
    correct: 3,
    accuracyPercent: 75,
    xpEarned: 30,
  },
  'partial sessions should calculate remaining questions and partial accuracy'
)

assert.deepEqual(
  exerciseSessionProgress({ current_index: 10, total_count: 10, correct_count: 8, xp_earned: 80 }),
  {
    answered: 10,
    total: 10,
    remaining: 0,
    correct: 8,
    accuracyPercent: 80,
    xpEarned: 80,
  },
  'completed sessions should not show negative remaining questions'
)

assert.deepEqual(
  exerciseSessionProgress({ current_index: -2, total_count: -10, correct_count: -1, xp_earned: null }),
  {
    answered: 0,
    total: 0,
    remaining: 0,
    correct: 0,
    accuracyPercent: 0,
    xpEarned: 0,
  },
  'missing or negative values should normalize to safe display values'
)

assert.deepEqual(
  exerciseSessionProgress(null),
  {
    answered: 0,
    total: 0,
    remaining: 0,
    correct: 0,
    accuracyPercent: 0,
    xpEarned: 0,
  },
  'missing session should produce safe zero defaults'
)
