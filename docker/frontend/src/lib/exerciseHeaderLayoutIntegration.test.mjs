import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const exercisesSource = readFileSync(new URL('../pages/ExercisesQA.jsx', import.meta.url), 'utf8')

test('exercise header shows only completion percent and progress bar', () => {
  assert.match(exercisesSource, /{progress}% concluída/)
  assert.doesNotMatch(exercisesSource, /COMBO x/)
  assert.doesNotMatch(exercisesSource, /Sair da lição|window\.history\.back\(\)/)
  assert.doesNotMatch(exercisesSource, /Corações restantes|⚡|session\.hearts_left/)
})
