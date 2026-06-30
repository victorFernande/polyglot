import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('Exercises renders dialogue reaction as a local extra exercise without progress writes', () => {
  assert.match(exercisesSource, /import \{[^}]*buildDialogueReactionQueue[^}]*validateDialogueReactionSelection/s)
  assert.match(exercisesSource, /<DialogueReactionPractice\s+items=\{sessionItems\}\s+lesson=\{lesson\}\s+session=\{session\}\s+currentIndex=\{currentIndex\}/)
  assert.match(exercisesSource, /Exercício extra: resposta de diálogo/)
  assert.match(exercisesSource, /não altera XP\/progresso/)
  assert.doesNotMatch(exercisesSource, /<DialogueReactionPractice[^>]*(answerExerciseSession|completeExerciseSession|startExerciseSession|setSession|setSummary)/s)
})

test('DialogueReactionPractice uses the pure local queue and validation helpers', () => {
  assert.match(exercisesSource, /const queue = useMemo\(\(\) => buildDialogueReactionQueue\(items, \{ lesson, session, currentIndex \}\)/)
  assert.match(exercisesSource, /validateDialogueReactionSelection\(selectedOption, card\)/)
  assert.match(exercisesSource, /Próxima situação/)
})
