import assert from 'node:assert/strict'
import { voiceSegmentsForFeedback, voiceSegmentsForItem, voiceTextForItem, voiceTextForFeedback } from './voiceMode.mjs'

const item = {
  prompt: 'Unidade 1/10 — Café: como dizer “Olá” em Alemão?',
  answer: { value: 'Hallo' },
}

assert.equal(
  voiceTextForItem(item),
  'Unidade 1/10 — Café: como dizer “Olá” em Alemão?'
)

assert.equal(
  voiceTextForFeedback({ type: 'correct', explanation: 'Resposta correta: Hallo.' }),
  'Correto. Resposta correta: Hallo.'
)

assert.equal(
  voiceTextForFeedback({ type: 'wrong', mistake: { message: 'Você respondeu: X. Resposta correta: Hallo.' }, explanation: 'Use Hallo para olá.' }),
  'Marcado como erro. Você respondeu: X. Resposta correta: Hallo. Use Hallo para olá.'
)

assert.deepEqual(
  voiceSegmentsForItem({
    prompt: 'Unidade 1/10 — Café: escolha a imagem/frase que representa “Eu gostaria de um pão.” (Ich möchte ein Brot.)',
    answer: { value: 'Ich möchte ein Brot.' },
  }, 'de'),
  [
    { text: 'Unidade 1/10 — Café: escolha a imagem/frase que representa “Eu gostaria de um pão.”', lang: 'pt-BR' },
    { text: 'Ich möchte ein Brot.', lang: 'de-DE' },
  ]
)

assert.deepEqual(
  voiceSegmentsForItem({
    prompt: 'Unidade 1/10 — Café: como dizer “Olá” em Alemão?',
    answer: { value: 'Hallo' },
  }, 'de'),
  [
    { text: 'Unidade 1/10 — Café: como dizer “Olá” em Alemão? Resposta em alemão:', lang: 'pt-BR' },
    { text: 'Hallo', lang: 'de-DE' },
  ]
)

assert.deepEqual(
  voiceSegmentsForFeedback({ type: 'correct', explanation: 'Resposta correta: Hallo.', correctAnswer: { value: 'Hallo' } }, 'de'),
  [
    { text: 'Correto. Resposta correta:', lang: 'pt-BR' },
    { text: 'Hallo', lang: 'de-DE' },
  ]
)
