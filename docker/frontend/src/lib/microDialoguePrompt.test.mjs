import assert from 'node:assert/strict'
import test from 'node:test'

import { parseMicroDialoguePrompt } from './microDialoguePrompt.mjs'

test('parseMicroDialoguePrompt extracts person line, learner blank, and instruction from context choice prompt', () => {
  const prompt = [
    'Pessoa: Bonjour, je voudrais un café.',
    'Você: ___',
    'Escolha uma fala adequada para responder no café.',
  ].join('\n')

  assert.deepEqual(parseMicroDialoguePrompt(prompt), {
    partnerLabel: 'Pessoa',
    partnerText: 'Bonjour, je voudrais un café.',
    learnerLabel: 'Você',
    learnerText: '___',
    instruction: 'Escolha uma fala adequada para responder no café.',
  })
})

test('parseMicroDialoguePrompt returns null for non dialogue prompts', () => {
  assert.equal(parseMicroDialoguePrompt('como dizer “mais um café”?'), null)
})

test('parseMicroDialoguePrompt accepts dialogue prompts with verbose prefixes before the lines', () => {
  const prompt = 'Unidade 1/10 — Café · Tópico 2/10 — pedido: Pessoa: Guten Morgen!\nVocê: ___\nEscolha a melhor resposta.'

  assert.deepEqual(parseMicroDialoguePrompt(prompt), {
    partnerLabel: 'Pessoa',
    partnerText: 'Guten Morgen!',
    learnerLabel: 'Você',
    learnerText: '___',
    instruction: 'Escolha a melhor resposta.',
  })
})
