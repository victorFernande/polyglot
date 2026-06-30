import assert from 'node:assert/strict'
import test from 'node:test'

import { sequenceDialogueCanSubmit, sequenceDialoguePayload, sequenceDialogueSupportForPhrase } from './sequenceDialogue.mjs'

const item = {
  type: 'sequence_dialogue',
  answer: { value: ['Hallo', 'Ich möchte Kaffee', 'Wie viel kostet das?', 'Danke'] },
  pairs: [
    ['Olá', 'Hallo'],
    ['Eu gostaria de café', 'Ich möchte Kaffee'],
    ['Quanto custa?', 'Wie viel kostet das?'],
    ['Obrigado', 'Danke'],
  ],
}

test('sequenceDialoguePayload submits the ordered phrase cards as the backend built-list payload', () => {
  const selected = ['Hallo', 'Ich möchte Kaffee', 'Wie viel kostet das?', 'Danke']

  assert.deepEqual(sequenceDialoguePayload(selected), selected)
})

test('sequenceDialogueCanSubmit requires exactly every dialogue turn before checking', () => {
  assert.equal(sequenceDialogueCanSubmit(item, []), false)
  assert.equal(sequenceDialogueCanSubmit(item, ['Hallo', 'Ich möchte Kaffee', 'Danke']), false)
  assert.equal(sequenceDialogueCanSubmit(item, ['Hallo', 'Ich möchte Kaffee', 'Wie viel kostet das?', 'Danke']), true)
})

test('sequenceDialogueCanSubmit ignores non sequence-dialogue items', () => {
  assert.equal(sequenceDialogueCanSubmit({ type: 'build', answer: item.answer }, item.answer.value), false)
})

test('sequenceDialogueSupportForPhrase returns Portuguese support without changing payload value', () => {
  assert.equal(sequenceDialogueSupportForPhrase(item, 'Ich möchte Kaffee'), 'Eu gostaria de café')
  assert.equal(sequenceDialoguePayload(['Ich möchte Kaffee'])[0], 'Ich möchte Kaffee')
})

test('sequenceDialogueSupportForPhrase falls back safely when no pair exists', () => {
  assert.equal(sequenceDialogueSupportForPhrase(item, 'Unseen phrase'), '')
})
