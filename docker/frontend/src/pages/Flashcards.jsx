import React, { useEffect, useMemo, useState } from 'react'
import { RotateCcw, ChevronLeft, ChevronRight, Loader2, Shuffle } from 'lucide-react'
import LanguageFlag from '../components/LanguageFlag'
import { bootstrapUser, loadFlashcards } from '../lib/api'
import { handleFlashcardKeyDown } from '../lib/flashcardKeyboard.mjs'
import { shuffleFlashcards } from '../lib/flashcardOrder.mjs'
import { getFlashcardSupportVisibility } from '../lib/flashcardReveal.mjs'
import { addFlashcardToReviewQueue, mergeFlashcardsWithReviewQueue } from '../lib/flashcardReviewQueue.mjs'
import { getFlashcardFocusState, getFlashcardMicroGoalState, getFlashcardReviewJumpState, getFlashcardSessionStats } from '../lib/flashcardSessionStats.mjs'

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
  const [reviewQueue, setReviewQueue] = useState([])

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        await bootstrapUser()
        const data = await loadFlashcards(language, 100)
        setCards(data)
        setReviewQueue([])
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

  const visibleCards = useMemo(
    () => mergeFlashcardsWithReviewQueue(cards, reviewQueue),
    [cards, reviewQueue],
  )
  const card = visibleCards[index]
  const isReviewCard = index >= cards.length
  const progress = visibleCards.length ? ((index + 1) / visibleCards.length) * 100 : 0
  const currentLang = useMemo(() => LANGS.find((l) => l.code === language), [language])
  const supportVisibility = getFlashcardSupportVisibility({ flipped })
  const sessionStats = getFlashcardSessionStats({
    deckCount: cards.length,
    reviewQueueCount: reviewQueue.length,
    currentIndex: index,
  })
  const microGoalState = getFlashcardMicroGoalState({ studiedCount: sessionStats.studiedCount })
  const focusState = getFlashcardFocusState({
    studiedCount: sessionStats.studiedCount,
    reviewQueueCount: sessionStats.reviewQueueCount,
  })
  const reviewJumpState = useMemo(
    () => getFlashcardReviewJumpState({
      deckCount: cards.length,
      reviewQueueCount: reviewQueue.length,
      currentIndex: index,
    }),
    [cards.length, reviewQueue.length, index],
  )

  function next() {
    setIndex((i) => Math.min(visibleCards.length - 1, i + 1))
    setFlipped(false)
  }

  function prev() {
    setIndex((i) => Math.max(0, i - 1))
    setFlipped(false)
  }

  function shuffleDeck() {
    setCards((currentCards) => shuffleFlashcards(currentCards))
    setReviewQueue([])
    setIndex(0)
    setFlipped(false)
  }

  function restartDeck() {
    setIndex(0)
    setFlipped(false)
  }

  function markNeedsReview() {
    if (!card) return

    if (isReviewCard) {
      next()
      return
    }

    const nextReviewQueue = addFlashcardToReviewQueue(reviewQueue, card)
    const nextDeckLength = cards.length + nextReviewQueue.length
    setReviewQueue(nextReviewQueue)
    setIndex((i) => Math.min(nextDeckLength - 1, i + 1))
    setFlipped(false)
  }

  function jumpToReviewQueue() {
    setIndex(reviewJumpState.reviewQueueStartIndex)
    setFlipped(false)
  }

  useEffect(() => {
    function onKeyDown(event) {
      handleFlashcardKeyDown(event, {
        cardsLength: visibleCards.length,
        next,
        prev,
        flip: () => setFlipped((value) => !value),
        showFront: () => setFlipped(false),
        markNeedsReview,
        canMarkNeedsReview: Boolean(card) && !isReviewCard,
        jumpToReviewQueue,
        canJumpToReviewQueue: reviewJumpState.canJumpToReviewQueue,
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visibleCards.length, card, isReviewCard, reviewQueue, reviewJumpState])

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
          <span>{currentLang?.name} · card {index + 1}/{visibleCards.length}{isReviewCard ? ' · revisão' : ''}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="progress-bar mb-6"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>

        <div className={`mb-6 rounded-2xl border p-4 text-sm ${microGoalState.isComplete ? 'border-polyglot-accent/30 bg-polyglot-accent/10 text-gray-200' : 'border-white/10 bg-white/5 text-gray-300'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Meta rápida</p>
              <p className="mt-1 font-semibold text-white">{microGoalState.label}</p>
            </div>
            <span className={microGoalState.isComplete ? 'text-polyglot-accent' : 'text-gray-400'}>
              {microGoalState.message}
            </span>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Foco da sessão</p>
              <p className="mt-1 font-semibold text-white">{focusState.label}</p>
              <p className="mt-2 text-gray-400">{focusState.message}</p>
            </div>
            <div className="rounded-xl bg-black/20 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-polyglot-accent">{focusState.reviewPercent}%</div>
              <div className="text-xs text-gray-500">marcados</div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-3 text-gray-300">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Estudados</div>
            <div className="mt-1 text-xl font-bold text-white">{sessionStats.studiedCount}</div>
            <div className="text-xs text-gray-500">nesta sessão</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-gray-300">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Marcados</div>
            <div className="mt-1 text-xl font-bold text-white">{sessionStats.reviewQueueCount}</div>
            <div className="text-xs text-gray-500">para revisar</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-gray-300">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Restantes</div>
            <div className="mt-1 text-xl font-bold text-white">{sessionStats.remainingCount}</div>
            <div className="text-xs text-gray-500">no deck atual</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-gray-300">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Confiança</div>
            <div className="mt-1 text-xl font-bold text-polyglot-accent">{sessionStats.confidencePercent}%</div>
            <div className="text-xs text-gray-500">{sessionStats.confidenceLabel}</div>
          </div>
        </div>

        {card && (
          <button onClick={() => setFlipped(!flipped)} className="min-h-80 w-full rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 text-center transition hover:border-polyglot-accent/50">
            <div className="mb-4 flex justify-center"><LanguageFlag code={language} className="h-14 w-14" /></div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{flipped ? 'Verso' : 'Frente'} · {card.type}</p>
            <div className="mt-6 text-2xl font-bold leading-relaxed">{flipped ? card.back : card.front}</div>
            <p className="mt-8 text-sm text-gray-400">Toque no card para virar</p>
            <p className="mt-3 text-xs text-gray-500">Atalhos: ←/→ navegar · Espaço/Enter virar · R frente · N revisar depois · V revisar marcados</p>
          </button>
        )}

        {card && (supportVisibility.hint || supportVisibility.explanation) && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {supportVisibility.hint && (
              <div className="rounded-xl bg-white/5 p-4 text-sm text-gray-300"><strong>Dica:</strong> {card.hint}</div>
            )}
            {supportVisibility.explanation && (
              <div className="rounded-xl bg-white/5 p-4 text-sm text-gray-300"><strong>Explicação:</strong> {card.explanation}</div>
            )}
          </div>
        )}

        {sessionStats.isComplete && (
          <div className="mt-6 rounded-2xl border border-polyglot-accent/30 bg-polyglot-accent/10 p-5 text-sm text-gray-200">
            <p className="text-xs uppercase tracking-[0.3em] text-polyglot-accent">Sessão concluída</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Bom trabalho — deck finalizado!</h2>
            <p className="mt-2 text-gray-300">
              Você estudou {sessionStats.studiedCount} cards nesta rodada e marcou {sessionStats.reviewQueueCount} para revisar.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="btn-secondary inline-flex items-center gap-2" onClick={restartDeck}>
                <RotateCcw size={18} /> Recomeçar deck
              </button>
              <button className="btn-primary inline-flex items-center gap-2" onClick={shuffleDeck} disabled={cards.length < 2}>
                <Shuffle size={18} /> Misturar e recomeçar
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button className="btn-secondary inline-flex items-center gap-2" onClick={prev} disabled={index === 0}><ChevronLeft size={18} /> Anterior</button>
          <button className="btn-secondary inline-flex items-center gap-2" onClick={() => setFlipped(false)}><RotateCcw size={18} /> Frente</button>
          <button className="btn-secondary inline-flex items-center gap-2" onClick={shuffleDeck} disabled={cards.length < 2}><Shuffle size={18} /> Misturar</button>
          <button className="btn-secondary inline-flex items-center gap-2" onClick={markNeedsReview} disabled={!card || isReviewCard}>Não sabia · Revisar depois</button>
          {reviewJumpState.canJumpToReviewQueue && (
            <button className="btn-secondary inline-flex items-center gap-2" onClick={jumpToReviewQueue}>Revisar marcados agora</button>
          )}
          <button className="btn-primary inline-flex items-center gap-2" onClick={next} disabled={index + 1 >= visibleCards.length}>Próximo <ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  )
}
