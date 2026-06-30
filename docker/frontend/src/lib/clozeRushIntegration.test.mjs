import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('Exercises renders cloze rush as an explicitly local optional training panel', () => {
  assert.match(exercisesSource, /import \{[^}]*buildClozeRushQueue[^}]*validateClozeRushSelection[^}]*clozeRushPrompt/s)
  assert.match(exercisesSource, /Exercício extra: lacuna relâmpago/i)
  assert.match(exercisesSource, /não altera XP\/progresso/)
})

test('ClozeRushPractice receives session items without progress-changing callbacks', () => {
  assert.match(exercisesSource, /<ClozeRushPractice\s+items=\{sessionItems\}\s+lesson=\{lesson\}\s+session=\{session\}\s+currentIndex=\{currentIndex\}/)
  assert.doesNotMatch(exercisesSource, /<ClozeRushPractice[^>]*(answerExerciseSession|completeExerciseSession|startExerciseSession|setSession|setSummary)/s)
})
