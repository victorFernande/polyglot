import assert from 'node:assert/strict'
import { voiceSegmentsForAnswerOnly, voiceSegmentsForFeedback, voiceSegmentsForItem, voiceTextForItem, voiceTextForFeedback } from './voiceMode.mjs'

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
    type: 'listen_choice',
    prompt: 'Unidade 1/10 — Café: ouça o áudio e escolha a opção correta.',
    answer: { value: 'Hallo' },
  }, 'de'),
  [
    { text: 'Hallo', lang: 'de-DE' },
  ],
  'listen-choice question audio should speak the target answer in the studied language before answering'
)

assert.deepEqual(
  voiceSegmentsForItem({
    type: 'choice',
    prompt: 'Unidade 1/10 — Café: como dizer “Olá” em Alemão?',
    answer: { value: 'Hallo' },
  }, 'de'),
  [
    { text: 'como dizer “Olá” em Alemão?', lang: 'pt-BR' },
  ],
  'before answering, non-listening question audio must not reveal the correct answer or read the long unit/topic prefix'
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
    { text: 'Correto.', lang: 'pt-BR' },
    { text: 'Hallo', lang: 'de-DE' },
  ],
  'after a correct answer, speak only Correct plus the correct answer in the target language'
)

assert.deepEqual(
  voiceSegmentsForFeedback({
    type: 'correct',
    explanation: 'Fazendo um pedido no café: “Wie viel kostet das?” corresponde a “Quanto custa?”. Use esta frase pronta como bloco real de comunicação em Alemão.',
    correctAnswer: { value: 'Wie viel kostet das?' },
  }, 'de'),
  [
    { text: 'Correto.', lang: 'pt-BR' },
    { text: 'Wie viel kostet das?', lang: 'de-DE' },
  ],
  'correct feedback must not read long explanations aloud'
)

assert.deepEqual(
  voiceSegmentsForFeedback({
    type: 'wrong',
    mistake: { message: 'Você respondeu: Guten Morgen. Resposta correta: Hallo.' },
    explanation: 'Use Hallo para olá.',
    correctAnswer: { value: 'Hallo' },
  }, 'de'),
  [
    { text: 'Resposta correta:', lang: 'pt-BR' },
    { text: 'Hallo', lang: 'de-DE' },
  ],
  'after a wrong answer, speak only the correct answer without the long explanation'
)

assert.deepEqual(
  voiceSegmentsForFeedback({
    type: 'wrong',
    mistake: { message: 'Resposta incorreta.' },
    explanation: 'A resposta correta é Ich möchte ein Brot.',
    correctAnswer: { value: 'Ich möchte ein Brot.' },
  }, 'de'),
  [
    { text: 'Resposta correta:', lang: 'pt-BR' },
    { text: 'Ich möchte ein Brot.', lang: 'de-DE' },
  ],
  'wrong feedback should stay short even when the explanation is long'
)


assert.deepEqual(
  voiceSegmentsForAnswerOnly({ correctAnswer: { value: 'Wie viel kostet das?' } }, 'de'),
  [
    { text: 'Wie viel kostet das?', lang: 'de-DE' },
  ],
  'answer-only replay should speak only the correct answer in the studied language'
)

assert.deepEqual(
  voiceSegmentsForAnswerOnly({ mistake: { correct_answer: { value: 'Bonjour' } } }, 'fr'),
  [
    { text: 'Bonjour', lang: 'fr-FR' },
  ],
  'answer-only replay should also work after wrong answers'
)
