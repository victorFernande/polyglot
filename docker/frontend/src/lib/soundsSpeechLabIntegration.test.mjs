import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const pageSource = readFileSync(new URL('../pages/Sounds.jsx', import.meta.url), 'utf8')

assert.match(pageSource, /SPEECH_TEST_LANGUAGES\.map/, 'Som page must render flag buttons for every speech test language')
assert.match(pageSource, /translateSpeechTestText\(speechInput, language\.code\)/, 'clicking a flag must translate the typed text to the selected language')
assert.match(pageSource, /<textarea[\s\S]*value=\{speechInput\}/, 'Som page must provide a text box for the source phrase')
assert.match(pageSource, /translatedSpeechText/, 'Som page must display the translated text')
assert.match(pageSource, /speakTranslatedText/, 'Som page must expose a button action to speak the translated text')
assert.match(pageSource, /speechPlaybackRef\.current\?\.speakSegments\(\[\{ text: translatedSpeechText, lang: selectedSpeechLanguage\.speechLang \}\]\)/, 'speech button must speak the translated text with the selected language voice')
assert.match(pageSource, /LanguageFlag code=\{language\.code\}/, 'language choices must use flag buttons')
