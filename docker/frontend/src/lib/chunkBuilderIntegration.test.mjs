import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('Exercises wires chunk builder helpers without creating progress-changing local callbacks', () => {
  assert.match(exercisesSource, /import \{[^}]*buildChunkBuilderQueue[^}]*validateChunkBuilderAnswer/s)
  assert.match(exercisesSource, /Exercício extra: monte por blocos/)
  assert.match(exercisesSource, /não altera XP\/progresso/)
  assert.match(exercisesSource, /<ChunkBuilderPractice\s+items=\{sessionItems\}\s+lesson=\{lesson\}\s+session=\{session\}\s+currentIndex=\{currentIndex\}\s*\/>/s)
  assert.doesNotMatch(exercisesSource, /<ChunkBuilderPractice[^>]*(answerExerciseSession|completeExerciseSession|startExerciseSession|setSession|setSummary)/s)
})
