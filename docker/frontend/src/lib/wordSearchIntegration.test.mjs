import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('Exercises renders the word-search as an explicitly local training panel', () => {
  assert.match(exercisesSource, /import \{[^}]*eligibleWordSearchWords[^}]*generateWordSearchGrid[^}]*validateWordSearchSelection[^}]*wordSearchSeed/s)
  assert.match(exercisesSource, /Treino local: caça-palavra/)
  assert.match(exercisesSource, /não altera XP\/progresso/)
})

test('WordSearchPractice receives lesson and session data without answer submission callbacks', () => {
  assert.match(exercisesSource, /<WordSearchPractice\s+items=\{sessionItems\}\s+lesson=\{lesson\}\s+session=\{session\}\s+currentIndex=\{currentIndex\}/)
  assert.doesNotMatch(exercisesSource, /<WordSearchPractice[^>]*(answerExerciseSession|completeExerciseSession|setSession|setSummary)/s)
})
