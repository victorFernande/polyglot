import assert from 'node:assert/strict'
import test from 'node:test'

import { SOUND_CATALOG } from './soundCatalog.mjs'

test('sound catalog lists every reusable app sound for the Som page', () => {
  assert.deepEqual(
    SOUND_CATALOG.map((sound) => sound.id),
    ['answer-correct', 'answer-wrong', 'session-completion'],
  )
  assert.deepEqual(
    SOUND_CATALOG.map((sound) => sound.label),
    ['Acerto', 'Erro', 'Conclusão de sessão'],
  )
})

test('sound catalog entries expose playable actions and descriptions', () => {
  for (const sound of SOUND_CATALOG) {
    assert.equal(typeof sound.play, 'function', `${sound.id} must expose a play() function`)
    assert.equal(typeof sound.unlock, 'function', `${sound.id} must expose an unlock() function`)
    assert.ok(sound.description.length > 20, `${sound.id} should explain when the sound plays`)
  }
})
