import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('Exercises renders error-spotter as an explicitly local build-sentence practice panel', () => {
  assert.match(exercisesSource, /import \{[^}]*buildErrorSpotterQueue[^}]*validateErrorSpotterSelection[^}]*\} from '\.\.\/lib\/errorSpotter\.mjs'/s)
  assert.match(exercisesSource, /<ErrorSpotterPractice items=\{sessionItems\} lesson=\{lesson\} session=\{session\} currentIndex=\{currentIndex\} \/>/)
  assert.match(exercisesSource, /Exercício extra: caça-erro/)
  assert.match(exercisesSource, /não altera XP\/progresso/)
})

test('ErrorSpotterPractice keeps feedback local and does not call exercise progress APIs', () => {
  const start = exercisesSource.indexOf('function ErrorSpotterPractice')
  assert.notEqual(start, -1)
  const end = exercisesSource.indexOf('function ClozeRushPractice', start)
  const componentSource = exercisesSource.slice(start, end === -1 ? undefined : end)

  assert.doesNotMatch(componentSource, /answerExerciseSession|completeExerciseSession|startExerciseSession|setSession|setSummary/)
  assert.match(componentSource, /validateErrorSpotterSelection/)
  assert.match(componentSource, /setCorrectCount/)
})
