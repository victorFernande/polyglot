import assert from 'node:assert/strict'
import { buildExerciseFeedback } from './exerciseFeedback.mjs'
import { voiceSegmentsForFeedback } from './voiceMode.mjs'

const pronunciationLikeItem = {
  id: 2,
  type: 'listen_choice',
  prompt: 'Unidade 1/10 — Café: ouça/reconheça “Olá”',
  answer: { value: 'Hallo' },
}

const correctResultWithoutExplicitCorrectAnswer = {
  is_correct: true,
  explanation: 'Resposta correta: Hallo.',
}

const feedback = buildExerciseFeedback(correctResultWithoutExplicitCorrectAnswer, pronunciationLikeItem, 1)

assert.deepEqual(feedback.correctAnswer, { value: 'Hallo' })
assert.equal(feedback.type, 'correct')
assert.deepEqual(
  voiceSegmentsForFeedback(feedback, 'de'),
  [
    { text: 'Correto. Resposta correta:', lang: 'pt-BR' },
    { text: 'Hallo', lang: 'de-DE' },
  ],
  'correct pronunciation/listening feedback must include the correct answer and speak it in the studied language'
)
