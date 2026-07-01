import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizedLanguageProgress } from './dashboardLanguageProgress.mjs'

test('normalizedLanguageProgress reports progress from 1 to 1000 exercises', () => {
  const progress = normalizedLanguageProgress({ completed_exercises: 250, total_exercises: 1000 })

  assert.equal(progress.completed, 250)
  assert.equal(progress.total, 1000)
  assert.equal(progress.percent, 25)
  assert.equal(progress.label, '250/1000 exercícios')
})

test('normalizedLanguageProgress clamps values to the 0-100 percent range', () => {
  assert.equal(normalizedLanguageProgress({ completed_exercises: -10, total_exercises: 1000 }).percent, 0)
  assert.equal(normalizedLanguageProgress({ completed_exercises: 1200, total_exercises: 1000 }).percent, 100)
})
