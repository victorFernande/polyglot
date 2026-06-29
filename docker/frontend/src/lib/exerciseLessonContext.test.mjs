import assert from 'node:assert/strict'
import test from 'node:test'

import { lessonContextForExercise } from './exerciseLessonContext.mjs'

test('lessonContextForExercise exposes title and description when a lesson is active', () => {
  const context = lessonContextForExercise({
    title: 'Fazendo um pedido no café',
    description: 'Pedir bebida/comida simples e agradecer.',
  })

  assert.deepEqual(context, {
    label: 'Unidade atual',
    title: 'Fazendo um pedido no café',
    description: 'Pedir bebida/comida simples e agradecer.',
  })
})

test('lessonContextForExercise trims missing description and keeps the title only', () => {
  const context = lessonContextForExercise({
    title: 'Viagem e direções',
    description: '   ',
  })

  assert.deepEqual(context, {
    label: 'Unidade atual',
    title: 'Viagem e direções',
    description: '',
  })
})

test('lessonContextForExercise returns null without a usable lesson title', () => {
  assert.equal(lessonContextForExercise(null), null)
  assert.equal(lessonContextForExercise({ description: 'Sem título' }), null)
})
