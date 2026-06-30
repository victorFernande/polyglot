import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('local practice activities render as one extra exercise item at a time', () => {
  assert.match(exercisesSource, /<LocalPracticeCarousel/, 'Exercises page should wrap local activities in a single visible carousel')
  assert.match(exercisesSource, /function LocalPracticeCarousel/, 'LocalPracticeCarousel component should exist')
  assert.match(exercisesSource, /React\.Children\.toArray\(children\)/, 'Carousel should manage local activity children as items')
  assert.match(exercisesSource, /visiblePracticeItems\[safeActiveIndex\]/, 'Carousel should render only the active local activity')
  assert.doesNotMatch(exercisesSource, /Treino local:/, 'Local activities should no longer be labeled as Treino local panels')
  assert.match(exercisesSource, /Exercício extra/, 'Local activities should be presented as exercise-like items')
})
