import assert from 'node:assert/strict'
import test from 'node:test'

import { nextExerciseActionLabel, sessionNumberForExerciseSession } from './exerciseSessionLabels.mjs'

test('nextExerciseActionLabel says next session instead of question 11 at session end', () => {
  assert.equal(nextExerciseActionLabel({ current_index: 10, total_count: 10 }), 'Salvar e ir para próxima sessão')
})

test('nextExerciseActionLabel keeps normal continue copy inside a session', () => {
  assert.equal(nextExerciseActionLabel({ current_index: 4, total_count: 10 }), 'Continuar')
})

test('sessionNumberForExerciseSession derives active session number from lesson metadata', () => {
  assert.equal(sessionNumberForExerciseSession({ session_number: 4 }, { completed_sessions: 2 }), 4)
  assert.equal(sessionNumberForExerciseSession({}, { completed_sessions: 3 }), 4)
})
