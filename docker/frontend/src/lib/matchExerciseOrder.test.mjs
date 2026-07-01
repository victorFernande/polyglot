import assert from 'node:assert/strict'
import test from 'node:test'

import { orderedMatchColumns } from './matchExerciseOrder.mjs'

const pairs = [
  ['audio-a', 'frase A'],
  ['audio-b', 'frase B'],
  ['audio-c', 'frase C'],
  ['audio-d', 'frase D'],
]

test('listen_match shuffles audio and translation columns independently from backend pair order', () => {
  const columns = orderedMatchColumns({ id: 376, type: 'listen_match', pairs })

  assert.deepEqual([...columns.leftItems].sort(), pairs.map(([left]) => left).sort())
  assert.deepEqual([...columns.rightItems].sort(), pairs.map(([, right]) => right).sort())
  assert.notDeepEqual(columns.leftItems, pairs.map(([left]) => left))
  assert.notDeepEqual(columns.rightItems, pairs.map(([, right]) => right))
})

test('match keeps deterministic order for the same item id', () => {
  const first = orderedMatchColumns({ id: 376, type: 'listen_match', pairs })
  const second = orderedMatchColumns({ id: 376, type: 'listen_match', pairs })

  assert.deepEqual(second, first)
})

test('plain match also decouples visible term and pair order without changing answer pairs', () => {
  const columns = orderedMatchColumns({ id: 367, type: 'match', pairs })

  assert.deepEqual([...columns.leftItems].sort(), pairs.map(([left]) => left).sort())
  assert.deepEqual([...columns.rightItems].sort(), pairs.map(([, right]) => right).sort())
  assert.notDeepEqual(columns.rightItems, pairs.map(([, right]) => right))
})
