import assert from 'node:assert/strict'
import test from 'node:test'

import { hintForExerciseType } from './exerciseTypeHint.mjs'

test('hintForExerciseType returns concise guidance for known exercise types', () => {
  assert.equal(hintForExerciseType('choice'), 'Escolha a melhor resposta.')
  assert.equal(hintForExerciseType('listen_choice'), 'Ouça e escolha o que corresponde.')
  assert.equal(hintForExerciseType('context_choice'), 'Use o contexto para escolher.')
  assert.equal(hintForExerciseType('image_choice'), 'Escolha a imagem correta.')
  assert.equal(hintForExerciseType('build'), 'Monte a frase na ordem correta.')
  assert.equal(hintForExerciseType('match'), 'Relacione cada item ao par correto.')
})

test('hintForExerciseType falls back to generic guidance for unknown or missing types', () => {
  assert.equal(hintForExerciseType('pronunciation'), 'Responda à atividade.')
  assert.equal(hintForExerciseType(undefined), 'Responda à atividade.')
})
