import assert from 'node:assert/strict'
import test from 'node:test'
import {
  difficultyLabelForItem,
  feedbackToneForResult,
  instructionForItemType,
  progressPercentForSession,
} from './exerciseLayoutState.mjs'

test('instructionForItemType returns short commands for varied real session items', () => {
  assert.equal(instructionForItemType({ type: 'choice' }), 'Escolha a resposta correta:')
  assert.equal(instructionForItemType({ type: 'listen_choice' }), 'Ouça e escolha:')
  assert.equal(instructionForItemType({ type: 'context_choice' }), 'Escolha a melhor resposta:')
  assert.equal(instructionForItemType({ type: 'image_choice' }), 'Observe e escolha:')
  assert.equal(instructionForItemType({ type: 'build' }), 'Monte a frase:')
  assert.equal(instructionForItemType({ type: 'listen_build' }), 'Ouça e monte:')
  assert.equal(instructionForItemType({ type: 'sequence_dialogue' }), 'Ordene o diálogo:')
  assert.equal(instructionForItemType({ type: 'match' }), 'Relacione os pares:')
  assert.equal(instructionForItemType({ type: 'listen_match' }), 'Ouça e relacione:')
})

test('progressPercentForSession clamps current session progress', () => {
  assert.equal(progressPercentForSession({ current_index: 0, total_count: 20 }), 0)
  assert.equal(progressPercentForSession({ current_index: 10, total_count: 20 }), 50)
  assert.equal(progressPercentForSession({ current_index: 25, total_count: 20 }), 100)
})

test('feedbackToneForResult maps answer states to semantic UI tones', () => {
  assert.equal(feedbackToneForResult(null), 'idle')
  assert.equal(feedbackToneForResult({ type: 'correct' }), 'correct')
  assert.equal(feedbackToneForResult({ type: 'wrong' }), 'wrong')
})

test('difficultyLabelForItem returns optional harder label without creating new exercise modes', () => {
  assert.equal(difficultyLabelForItem({ type: 'sequence_dialogue' }), 'MAIS DIFÍCIL')
  assert.equal(difficultyLabelForItem({ type: 'build' }), 'MAIS DIFÍCIL')
  assert.equal(difficultyLabelForItem({ type: 'listen_match' }), 'MAIS DIFÍCIL')
  assert.equal(difficultyLabelForItem({ type: 'choice' }), '')
})
