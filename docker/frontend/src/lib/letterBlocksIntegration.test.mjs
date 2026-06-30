import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')
const packageSource = readFileSync(new URL('../../package.json', import.meta.url), 'utf8')

test('Exercises renders Letter Blocks as an explicitly local training panel', () => {
  assert.match(exercisesSource, /import \{[^}]*eligibleLetterBlockWords[^}]*generateLetterBlocksPuzzle[^}]*validateLetterBlocksPath[^}]*letterBlocksSeed/s)
  assert.match(exercisesSource, /Exercício extra: blocos de letras/i)
  assert.match(exercisesSource, /não altera XP\/progresso/)
  assert.match(exercisesSource, /Limpar seleção/)
  assert.match(exercisesSource, /Reiniciar/)
})

test('LetterBlocksPractice receives lesson and session data without answer submission callbacks', () => {
  assert.match(exercisesSource, /<LetterBlocksPractice\s+items=\{sessionItems\}\s+lesson=\{lesson\}\s+session=\{session\}\s+currentIndex=\{currentIndex\}/)
  assert.doesNotMatch(exercisesSource, /<LetterBlocksPractice[^>]*(answerExerciseSession|completeExerciseSession|setSession|setSummary)/s)
})

test('test:voice runs the Letter Blocks regression tests', () => {
  assert.match(packageSource, /node src\/lib\/letterBlocks\.test\.mjs/)
  assert.match(packageSource, /node src\/lib\/letterBlocksIntegration\.test\.mjs/)
})
