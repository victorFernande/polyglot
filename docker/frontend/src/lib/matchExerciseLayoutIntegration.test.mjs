import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const exercisesSource = readFileSync(new URL('../pages/ExercisesQA.jsx', import.meta.url), 'utf8')

test('match exercise shows all pair cards face-up for direct pair selection', () => {
  assert.match(exercisesSource, /function MatchExerciseBody\(/)
  assert.doesNotMatch(exercisesSource, /Vire duas cartas|Pares corretos ficam revelados/, 'match exercise should not be a memory flip game')
  assert.doesNotMatch(exercisesSource, /revealed\s*=|selectedCards|mismatchedIds|memoryMatchSelection/, 'match UI should not hide cards behind memory-game state')
  assert.match(exercisesSource, /Selecione os pares correspondentes|Escolha um termo e depois o par correspondente/)
})
