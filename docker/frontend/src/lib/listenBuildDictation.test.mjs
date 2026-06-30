import assert from 'node:assert/strict'
import test from 'node:test'

import { buildListenBuildDictationPayload, canSubmitListenBuildDictation } from './listenBuildDictation.mjs'

test('buildListenBuildDictationPayload trims Portuguese-style spacing into word payload', () => {
  assert.deepEqual(buildListenBuildDictationPayload(' Ich   lese   Buch '), ['Ich', 'lese', 'Buch'])
})

test('buildListenBuildDictationPayload preserves non-Latin language tokens', () => {
  assert.deepEqual(buildListenBuildDictationPayload('Я читаю книгу'), ['Я', 'читаю', 'книгу'])
  assert.deepEqual(buildListenBuildDictationPayload('本を 読みます'), ['本を', '読みます'])
})

test('canSubmitListenBuildDictation requires the typed word count to match the expected answer', () => {
  const item = { answer: { value: ['Ich', 'lese', 'Buch'] } }

  assert.equal(canSubmitListenBuildDictation(item, 'Ich lese Buch'), true)
  assert.equal(canSubmitListenBuildDictation(item, 'Ich lese'), false)
  assert.equal(canSubmitListenBuildDictation(item, '   '), false)
})
