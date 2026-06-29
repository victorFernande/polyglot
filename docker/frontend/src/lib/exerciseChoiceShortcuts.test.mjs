import test from 'node:test'
import assert from 'node:assert/strict'

import { choiceShortcutLabels } from './exerciseChoiceShortcuts.mjs'

test('choiceShortcutLabels returns visible number badges matching option order', () => {
  assert.deepEqual(choiceShortcutLabels(['eins', 'zwei', 'drei', 'vier']), ['1', '2', '3', '4'])
})

test('choiceShortcutLabels only labels the options supported by keyboard shortcuts', () => {
  assert.deepEqual(choiceShortcutLabels(['a', 'b', 'c', 'd', 'e']), ['1', '2', '3', '4', null])
})

test('choiceShortcutLabels handles missing options as no badges', () => {
  assert.deepEqual(choiceShortcutLabels(null), [])
})
