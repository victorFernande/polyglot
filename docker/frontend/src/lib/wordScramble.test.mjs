import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildWordScrambleQueue,
  normalizeWordScrambleAnswer,
  validateWordScrambleAnswer,
} from './wordScramble.mjs'

const sessionItems = [
  { id: 'a', type: 'choice', prompt: 'Escolha “casa”.', answer: { value: 'Haus' } },
  { id: 'b', type: 'build', prompt: 'Monte: Eu bebo água.', answer: { value: ['Wasser'] } },
  { id: 'c', type: 'choice', prompt: 'Frase com espaço.', answer: { value: 'guten Morgen' } },
  { id: 'd', type: 'choice', prompt: 'Duplicado com caixa diferente.', answer: { value: 'haus' } },
  { id: 'e', type: 'choice', prompt: 'Japonês curto compacto.', answer: { value: '本' } },
  { id: 'f', type: 'choice', prompt: 'Muito curto latino.', answer: { value: 'an' } },
]

test('buildWordScrambleQueue keeps unique one-token answers from the active session', () => {
  const queue = buildWordScrambleQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's2' }, currentIndex: 0 })

  assert.deepEqual(queue.map((card) => card.answer), ['Haus', 'Wasser', '本'])
  assert.equal(queue.every((card) => card.prompt && card.seed && card.letters.length > 0), true)
})

test('buildWordScrambleQueue shuffles letters deterministically without returning the original order when possible', () => {
  const first = buildWordScrambleQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's2' }, currentIndex: 1 })
  const second = buildWordScrambleQueue(sessionItems, { lesson: { id: 'de-1' }, session: { id: 's2' }, currentIndex: 1 })
  const haus = first.find((card) => card.answer === 'Haus')

  assert.deepEqual(first, second)
  assert.deepEqual([...haus.letters].sort(), [...'Haus'].sort())
  assert.notDeepEqual(haus.letters, [...'Haus'])
})

test('validateWordScrambleAnswer compares NFC text case-insensitively', () => {
  assert.equal(normalizeWordScrambleAnswer(' ÉCOLE '), 'école')
  assert.deepEqual(validateWordScrambleAnswer(['h', 'a', 'u', 's'], 'Haus'), { status: 'correct', expected: 'Haus' })
  assert.deepEqual(validateWordScrambleAnswer(['H', 'a', 's'], 'Haus'), { status: 'wrong', expected: 'Haus' })
})
