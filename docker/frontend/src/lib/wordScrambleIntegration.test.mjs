import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('Exercises renders word scramble as an explicitly local optional training panel', () => {
  assert.match(exercisesSource, /import \{[^}]*buildWordScrambleQueue[^}]*validateWordScrambleAnswer/s)
  assert.match(exercisesSource, /Treino local: palavra embaralhada/)
  assert.match(exercisesSource, /não altera XP\/progresso/)
})

test('WordScramblePractice receives session items without progress-changing callbacks', () => {
  assert.match(exercisesSource, /<WordScramblePractice\s+items=\{sessionItems\}\s+lesson=\{lesson\}\s+session=\{session\}\s+currentIndex=\{currentIndex\}/)
  assert.doesNotMatch(exercisesSource, /<WordScramblePractice[^>]*(answerExerciseSession|completeExerciseSession|startExerciseSession|setSession|setSummary)/s)
})
