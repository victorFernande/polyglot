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
    { text: 'escolha a imagem/frase que representa “Eu gostaria de um pão.”', lang: 'pt-BR' },
  ],
  'before answering, image-choice prompts must not speak the target-language answer hidden in parentheses or the long unit/topic prefix'
)

assert.deepEqual(
  voiceSegmentsForItem({
    prompt: 'Unidade 1/10 — Café: como dizer “Olá” em Alemão?',
    answer: { value: 'Hallo' },
  }, 'de'),
  [
    { text: 'como dizer “Olá” em Alemão?', lang: 'pt-BR' },
  ],
  'before answering, question audio must not reveal the correct answer or read the long unit/topic prefix'
)

assert.deepEqual(
  voiceSegmentsForItem({
    prompt: 'Unidade 1/10 — Fazendo um pedido no café · Tópico 5/10 — usar por favor: como dizer “Olá” em Alemão?',
    answer: { value: 'Hallo' },
  }, 'de'),
  [
    { text: 'como dizer “Olá” em Alemão?', lang: 'pt-BR' },
  ],
  'question audio should speak only the useful instruction after the unit/topic prefix'
)

assert.deepEqual(
  voiceSegmentsForFeedback({ type: 'correct', explanation: 'Resposta correta: Hallo.', correctAnswer: { value: 'Hallo' } }, 'de'),
  [
    { text: 'Correto. Resposta correta:', lang: 'pt-BR' },
    { text: 'Hallo', lang: 'de-DE' },
  ],
  'after a correct answer, the correct answer should be spoken in the target language'
)

assert.deepEqual(
  voiceSegmentsForFeedback({
    type: 'wrong',
    mistake: { message: 'Você respondeu: Guten Morgen. Resposta correta: Hallo.' },
    explanation: 'Use Hallo para olá.',
    correctAnswer: { value: 'Hallo' },
  }, 'de'),
  [
    { text: 'Marcado como erro. Você respondeu: Guten Morgen. Resposta correta:', lang: 'pt-BR' },
    { text: 'Hallo', lang: 'de-DE' },
    { text: 'Use Hallo para olá.', lang: 'pt-BR' },
  ],
  'after a wrong answer, the feedback should say the correct answer and speak it in the target language'
)

assert.deepEqual(
  voiceSegmentsForFeedback({
    type: 'wrong',
    mistake: { message: 'Resposta incorreta.' },
    explanation: 'A resposta correta é Ich möchte ein Brot.',
    correctAnswer: { value: 'Ich möchte ein Brot.' },
  }, 'de'),
  [
    { text: 'Marcado como erro. Resposta incorreta. A resposta correta é', lang: 'pt-BR' },
    { text: 'Ich möchte ein Brot.', lang: 'de-DE' },
  ],
  'wrong feedback should handle the correct answer even when it appears in the explanation instead of the mistake message'
)
