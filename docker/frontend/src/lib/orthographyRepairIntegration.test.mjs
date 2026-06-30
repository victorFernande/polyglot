import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('Exercises renders orthography repair as an explicitly local optional training panel', () => {
  assert.match(exercisesSource, /import \{[^}]*buildOrthographyRepairQueue[^}]*validateOrthographyRepairAnswer[^}]*damageOrthographyRepairText/s)
  assert.match(exercisesSource, /Treino local: reparador de ortografia/)
  assert.match(exercisesSource, /Repare a frase/)
  assert.match(exercisesSource, /não altera XP\/progresso/)
})

test('OrthographyRepairPractice receives session items without progress-changing callbacks', () => {
  assert.match(exercisesSource, /<OrthographyRepairPractice\s+items=\{sessionItems\}\s+lesson=\{lesson\}\s+session=\{session\}\s+currentIndex=\{currentIndex\}/)
  assert.doesNotMatch(exercisesSource, /<OrthographyRepairPractice[^>]*(answerExerciseSession|completeExerciseSession|startExerciseSession|setSession|setSummary)/s)
})

test('Orthography repair feedback distinguishes correct close and wrong states', () => {
  assert.match(exercisesSource, /Correto — ortografia restaurada\./)
  assert.match(exercisesSource, /Quase: palavras certas, mas revise maiúsculas\/pontuação\./)
  assert.match(exercisesSource, /Resposta esperada:/)
})
