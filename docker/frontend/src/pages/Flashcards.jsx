import React, { useEffect, useMemo, useState } from 'react'
import { RotateCcw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import LanguageFlag from '../components/LanguageFlag'
import { bootstrapUser, loadFlashcards } from '../lib/api'
import { handleFlashcardKeyDown } from '../lib/flashcardKeyboard.mjs'

const LANGS = [
  { code: 'de', name: 'Alemão' },
  { code: 'fr', name: 'Francês' },
  { code: 'ru', name: 'Russo' },
  { code: 'jp', name: 'Japonês' },
  { code: 'en', name: 'Inglês' },
]

export default function Flashcards() {
  const [language, setLanguage] = useState('de')
  const [cards, setCards] = useState([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        await bootstrapUser()
        const data = await loadFlashcards(language, 100)
        setCards(data)
        setIndex(0)
        setFlipped(false)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [language])

  const card = cards[index]
  const progress = cards.length ? ((index + 1) / cards.length) * 100 : 0
  const currentLang = useMemo(() => LANGS.find((l) => l.code === language), [language])

  function next() {
    setIndex((i) => Math.min(cards.length - 1, i + 1))
    setFlipped(false)
  }

  function prev() {
    setIndex((i) => Math.max(0, i - 1))
    setFlipped(false)
  }

  useEffect(() => {
    function onKeyDown(event) {
      handleFlashcardKeyDown(event, {
        cardsLength: cards.length,
        next,
        prev,
        flip: () => setFlipped((value) => !value),
        showFront: () => setFlipped(false),
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cards.length])

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-polyglot-accent" size={42} /></div>
  if (error) return <div className="card border-red-500/30 bg-red-500/10 text-red-200">Erro: {error}</div>

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🃏 Flashcards Web</h1>
        <p className="text-gray-400">Cards estilo Anki dentro da plataforma — sem baixar deck. Frente, verso, dica e explicação.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LANGS.map((lang) => (
          <button key={lang.code} onClick={() => setLanguage(lang.code)} className={`card p-4 text-left ${language === lang.code ? 'ring-2 ring-polyglot-accent' : 'hover:bg-white/5'}`}>
            <div className="flex items-center gap-3">
              <LanguageFlag code={lang.code} className="h-10 w-10" />
              <div>
                <div className="font-bold">{lang.name}</div>
                <div className="text-xs text-gray-400">1000 cards situacionais A1</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between text-sm text-gray-400">
          <span>{currentLang?.name} · card {index + 1}/{cards.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="progress-bar mb-6"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>

        {card && (
          <button onClick={() => setFlipped(!flipped)} className="min-h-80 w-full rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 text-center transition hover:border-polyglot-accent/50">
            <div className="mb-4 flex justify-center"><LanguageFlag code={language} className="h-14 w-14" /></div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{flipped ? 'Verso' : 'Frente'} · {card.type}</p>
            <div className="mt-6 text-2xl font-bold leading-relaxed">{flipped ? card.back : card.front}</div>
            <p className="mt-8 text-sm text-gray-400">Toque no card para virar</p>
            <p className="mt-3 text-xs text-gray-500">Atalhos: ←/→ navegar · Espaço/Enter virar · R frente</p>
          </button>
        )}

        {card && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-white/5 p-4 text-sm text-gray-300"><strong>Dica:</strong> {card.hint}</div>
            <div className="rounded-xl bg-white/5 p-4 text-sm text-gray-300"><strong>Explicação:</strong> {card.explanation}</div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button className="btn-secondary inline-flex items-center gap-2" onClick={prev} disabled={index === 0}><ChevronLeft size={18} /> Anterior</button>
          <button className="btn-secondary inline-flex items-center gap-2" onClick={() => setFlipped(false)}><RotateCcw size={18} /> Frente</button>
          <button className="btn-primary inline-flex items-center gap-2" onClick={next} disabled={index + 1 >= cards.length}>Próximo <ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  )
}
