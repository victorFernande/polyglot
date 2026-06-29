import assert from 'node:assert/strict'
import test from 'node:test'

import { audioSegmentsForFlashcard, hasFlashcardAudio } from './flashcardAudio.mjs'

test('listen flashcards expose target-language audio from backend payload', () => {
  const card = {
    type: 'listen_choice',
    front: 'Unidade 1/10 — Café: ouça o áudio e identifique “olá”',
    back: 'Hallo',
    audio_text: 'Hallo',
    audio_lang: 'de-DE',
  }

  assert.equal(hasFlashcardAudio(card), true)
  assert.deepEqual(audioSegmentsForFlashcard(card), [{ text: 'Hallo', lang: 'de-DE' }])
})

test('cards without real audio payload do not pretend there is audio to play', () => {
  const card = {
    type: 'choice',
    front: 'como dizer “olá” em Alemão?',
    back: 'Hallo',
  }

  assert.equal(hasFlashcardAudio(card), false)
  assert.deepEqual(audioSegmentsForFlashcard(card), [])
})

test('whitespace-only audio text does not render an empty playback control', () => {
  const card = {
    type: 'listen_choice',
    front: 'ouça o áudio',
    audio_text: '   ',
    audio_lang: 'de-DE',
  }

  assert.equal(hasFlashcardAudio(card), false)
  assert.deepEqual(audioSegmentsForFlashcard(card), [])
})
