import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('Exercises renders typing rush as an explicitly local optional training panel', () => {
  assert.match(exercisesSource, /import \{[^}]*buildTypingRushQueue[^}]*validateTypingRushAnswer[^}]*typingRushPrompt/s)
  assert.match(exercisesSource, /Exercício extra: digitação relâmpago/)
  assert.match(exercisesSource, /não altera XP\/progresso/)
})

test('TypingRushPractice receives session items without progress-changing callbacks', () => {
  assert.match(exercisesSource, /<TypingRushPractice\s+items=\{sessionItems\}\s+lesson=\{lesson\}\s+session=\{session\}\s+currentIndex=\{currentIndex\}/)
  assert.doesNotMatch(exercisesSource, /<TypingRushPractice[^>]*(answerExerciseSession|completeExerciseSession|startExerciseSession|setSession|setSummary)/s)
})
