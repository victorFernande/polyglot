import assert from 'node:assert/strict'
import test from 'node:test'

import { lessonContextForExercise } from './exerciseLessonContext.mjs'

test('lessonContextForExercise exposes title, description, units and topics when a lesson is active', () => {
  const context = lessonContextForExercise({
    title: 'Fazendo um pedido no café',
    description: 'Pedir bebida/comida simples e agradecer.',
    units: ['Unit 1'],
    topics: ['topic-a'],
  })

  assert.deepEqual(context, {
    label: 'Unidade atual',
    title: 'Fazendo um pedido no café',
    description: 'Pedir bebida/comida simples e agradecer.',
    units: ['Unit 1'],
    topics: ['topic-a'],
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
    units: undefined,
    topics: undefined,
  })
})

test('lessonContextForExercise returns null without a usable lesson title', () => {
  assert.equal(lessonContextForExercise(null), null)
  assert.equal(lessonContextForExercise({ description: 'Sem título' }), null)
})
