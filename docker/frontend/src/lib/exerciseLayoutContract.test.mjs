import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const exercisesSource = readFileSync(new URL('../pages/ExercisesQA.jsx', import.meta.url), 'utf8')

test('Exercises uses one real-session shell instead of extra/local panels', () => {
  assert.match(exercisesSource, /function ExerciseShell\(/, 'real session layout shell should exist')
  assert.match(exercisesSource, /function ExerciseFeedbackSheet\(/, 'feedback should live in a bottom sheet region')
  assert.match(exercisesSource, /EXPLIQUE MINHA RESPOSTA|Explicação/, 'existing explanation data should be reachable from feedback')
  assert.match(exercisesSource, /{progress}% concluída/, 'top progress should show session completion percentage')
  assert.doesNotMatch(exercisesSource, /COMBO x|Sair da lição|Corações restantes/, 'top progress should not show combo, close, or energy controls')
  assert.doesNotMatch(exercisesSource, /Exercício extra|Treino local|Questão extra|treino não altera XP\/progresso/i)
  assert.doesNotMatch(exercisesSource, /LocalPractice|function \w*Practice\(/, 'no parallel local practice components on Exercises page')
})

test('Exercises keeps varied exercise types as real session bodies', () => {
  assert.match(exercisesSource, /function ChoiceExerciseBody\(/)
  assert.match(exercisesSource, /function BuildExerciseBody\(/)
  assert.match(exercisesSource, /function MatchExerciseBody\(/)
  assert.match(exercisesSource, /function SequenceDialogueExerciseBody\(/)
})

test('ExercisesQA exposes session integrity metadata without adding local practice', () => {
  assert.match(exercisesSource, /function QaSessionIntegrityStrip\(/, 'QA route should render an integrity strip inside the session shell')
  assert.match(exercisesSource, /Item real da sessão backend/)
  assert.match(exercisesSource, /QA BLOCKER: sessão com mais de 20 itens/)
  assert.match(exercisesSource, /session\.total_count > 20/, 'QA blocker should be tied to the live backend session total')
  assert.match(exercisesSource, /session\.items\?\.length \|\| 0/, 'QA strip should expose the real backend item count')
  assert.match(exercisesSource, /sessionItemCount !== session\.total_count/, 'QA blocker should catch mismatched session item counts')
  assert.match(exercisesSource, /session\.current_index >= sessionItemCount/, 'QA blocker should catch exhausted or missing active item windows')
  assert.match(exercisesSource, /QA BLOCKER: current_index sem item real em session\.items/, 'QA strip should explain missing active item blockers')
  assert.match(exercisesSource, /item\.id/, 'QA strip should expose the active backend item id')
  assert.match(exercisesSource, /session\.items[\s\S]*\.reduce/, 'variety summary should be computed from real session.items')
  assert.match(exercisesSource, /XP real/)
  assert.doesNotMatch(exercisesSource, /Treino local|Questão extra|frontend-only/i)
})
