import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const prodSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')
const qaSource = readFileSync(new URL('../pages/ExercisesQA.jsx', import.meta.url), 'utf8')
const layoutStateSource = readFileSync(new URL('./exerciseLayoutState.mjs', import.meta.url), 'utf8')
const typeHintSource = readFileSync(new URL('./exerciseTypeHint.mjs', import.meta.url), 'utf8')

test('listen_match is a real scored match exercise in production and QA routes', () => {
  for (const source of [prodSource, qaSource]) {
    assert.match(source, /item\.type === 'listen_match'/, 'listen_match must be handled explicitly')
    assert.match(source, /\['match', 'listen_match'\]\.includes\(item\.type\)/, 'listen_match should submit the matched pairs payload')
    assert.match(source, /isListenMatch/, 'match body should switch to audio cards for listen_match')
    assert.match(source, /Áudios/, 'left column should be labelled as audio cards')
    assert.match(source, /Traduções/, 'right column should ask for translated Portuguese words')
    assert.match(source, /speechLangForLanguage\(langCode\)/, 'audio cards must speak in the studied language')
  }
})

test('listen_match has its own exercise instruction and hint', () => {
  assert.match(layoutStateSource, /listen_match:\s*'Ouça e relacione:'/, 'layout should explain the audio matching task')
  assert.match(typeHintSource, /listen_match:\s*'Ouça cada áudio e escolha a tradução em português\.'/, 'hint should describe audio-to-translation matching')
})
