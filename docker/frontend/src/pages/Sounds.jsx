import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Volume2, Sparkles, Languages } from 'lucide-react'
import LanguageFlag from '../components/LanguageFlag'
import { synthesizeSpeech } from '../lib/api'
import { createSpeechPlaybackController } from '../lib/speechPlayback.mjs'
import { speakSegmentsWithBrowser } from '../lib/voiceMode.mjs'
import { SOUND_CATALOG } from '../lib/soundCatalog.mjs'
import { SPEECH_TEST_LANGUAGES, translateSpeechTestText } from '../lib/speechLanguageLab.mjs'

export default function Sounds() {
  const [speechInput, setSpeechInput] = useState('Bom dia')
  const [selectedSpeechLanguage, setSelectedSpeechLanguage] = useState(SPEECH_TEST_LANGUAGES[0])
  const [translatedSpeechText, setTranslatedSpeechText] = useState(() => translateSpeechTestText('Bom dia', SPEECH_TEST_LANGUAGES[0].code))
  const speechPlaybackRef = useRef(null)

  useEffect(() => {
    speechPlaybackRef.current = createSpeechPlaybackController({
      synthesizeSpeech,
      fallbackSpeakSegments: speakSegmentsWithBrowser,
    })
    return () => speechPlaybackRef.current?.stop?.()
  }, [])

  const sampleHint = useMemo(() => 'Exemplos com tradução local: Bom dia, Obrigado, Eu quero café, Onde fica o banheiro?, Eu estou aprendendo idiomas.', [])

  function preview(sound) {
    sound.unlock()
    sound.play()
  }

  function selectSpeechLanguage(language) {
    const translated = translateSpeechTestText(speechInput, language.code)
    setSelectedSpeechLanguage(language)
    setTranslatedSpeechText(translated)
  }

  function speakTranslatedText() {
    if (!translatedSpeechText) return
    speechPlaybackRef.current?.speakSegments([{ text: translatedSpeechText, lang: selectedSpeechLanguage.speechLang }])
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">🔊 Som</h1>
        <p className="text-gray-400">
          Central de efeitos sonoros e testes de fala do Polyglot. Sempre que um novo som for criado, ele deve entrar no catálogo central e aparecer aqui para teste.
        </p>
      </div>

      <section className="card space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-polyglot-blue/20 text-polyglot-blue">
            <Languages size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Teste de fala por idioma</h2>
            <p className="text-sm text-gray-400">Digite em português, clique numa bandeira para traduzir e depois escute no idioma selecionado.</p>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-gray-300">Texto em português</span>
          <textarea
            value={speechInput}
            onChange={(event) => setSpeechInput(event.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-white outline-none transition focus:border-polyglot-accent"
            placeholder="Digite uma frase para traduzir e ouvir..."
          />
        </label>
        <p className="text-xs text-gray-500">{sampleHint}</p>

        <div className="flex flex-wrap gap-3">
          {SPEECH_TEST_LANGUAGES.map((language) => (
            <button
              key={language.code}
              type="button"
              onClick={() => selectSpeechLanguage(language)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${selectedSpeechLanguage.code === language.code ? 'border-polyglot-accent bg-polyglot-accent/20 text-polyglot-accent' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}
            >
              <LanguageFlag code={language.code} className="h-8 w-8" />
              <span className="font-semibold">{language.label}</span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-polyglot-gold">Tradução para {selectedSpeechLanguage.label}</p>
          <p className="mt-2 text-xl font-bold text-white">{translatedSpeechText || 'Clique numa bandeira para traduzir.'}</p>
        </div>

        <button
          type="button"
          className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-40"
          onClick={speakTranslatedText}
          disabled={!translatedSpeechText}
        >
          <Volume2 size={18} /> Falar tradução
        </button>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SOUND_CATALOG.map((sound) => (
          <section key={sound.id} className="card flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-polyglot-accent/20 text-polyglot-accent">
                    <Volume2 size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{sound.label}</h2>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-polyglot-gold">{sound.cue}</p>
                  </div>
                </div>
                <Sparkles className="text-polyglot-gold" size={20} />
              </div>
              <p className="text-sm text-gray-300">{sound.description}</p>
            </div>

            <button
              type="button"
              className="btn-primary inline-flex items-center justify-center gap-2"
              onPointerDown={() => sound.unlock()}
              onTouchStart={() => sound.unlock()}
              onClick={() => preview(sound)}
            >
              <Volume2 size={18} /> Testar som
            </button>
          </section>
        ))}
      </div>
    </div>
  )
}
