import assert from 'node:assert/strict'
import { voiceTextForItem, voiceTextForFeedback } from './voiceMode.mjs'

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
