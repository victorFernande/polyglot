import assert from 'node:assert/strict'
import test from 'node:test'

import { SPEECH_TEST_LANGUAGES, speechLangForTestLanguage, translateSpeechTestText } from './speechLanguageLab.mjs'

test('speech language lab exposes all Polyglot study languages for flag buttons', () => {
  assert.deepEqual(SPEECH_TEST_LANGUAGES.map((language) => language.code), ['de', 'fr', 'ru', 'jp', 'en'])
  assert.deepEqual(SPEECH_TEST_LANGUAGES.map((language) => language.speechLang), ['de-DE', 'fr-FR', 'ru-RU', 'ja-JP', 'en-US'])
})

test('translateSpeechTestText translates common Portuguese sample text to the selected language', () => {
  assert.equal(translateSpeechTestText('Bom dia', 'de'), 'Guten Morgen')
  assert.equal(translateSpeechTestText('Bom dia', 'fr'), 'Bonjour')
  assert.equal(translateSpeechTestText('Bom dia', 'ru'), 'Доброе утро')
  assert.equal(translateSpeechTestText('Bom dia', 'jp'), 'おはようございます')
  assert.equal(translateSpeechTestText('Bom dia', 'en'), 'Good morning')
})

test('translateSpeechTestText has deterministic fallback for custom text', () => {
  assert.equal(translateSpeechTestText('Teste personalizado', 'de'), 'Teste personalizado')
  assert.equal(speechLangForTestLanguage('jp'), 'ja-JP')
  assert.equal(speechLangForTestLanguage('unknown'), 'pt-BR')
})
