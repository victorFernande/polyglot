import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Heart, X, Volume2, RotateCcw, Trophy, ArrowRight, Loader2 } from 'lucide-react'
import LanguageFlag from '../components/LanguageFlag'
import { answerExerciseSession, bootstrapUser, completeExerciseSession, loadExerciseLessons, startExerciseSession, apiFetch } from '../lib/api'

const LANG_META = {
  de: { accent: 'Rammstein', color: 'from-red-600 to-red-900' },
  fr: { accent: 'Chanson', color: 'from-blue-600 to-blue-900' },
  ru: { accent: 'Cirílico', color: 'from-yellow-600 to-yellow-900' },
  jp: { accent: 'Anime/Manga', color: 'from-pink-600 to-pink-900' },
}

function answerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  return answer
}

function matchPairs(item) {
  if (Array.isArray(item.pairs)) return item.pairs
  if (item.answer?.pairs) return item.answer.pairs
  if (item.answer && typeof item.answer === 'object') return Object.entries(item.answer)
  return []
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5)
}

export default function Exercises() {
  const [user, setUser] = useState(null)
  const [lessons, setLessons] = useState([])
  const [lesson, setLesson] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [selected, setSelected] = useState(null)
  const [built, setBuilt] = useState([])
  const [matched, setMatched] = useState({})
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    async function boot() {
      try {
        setLoading(true)
        const u = await bootstrapUser()
        setUser(u)
        const data = await loadExerciseLessons(u.id)
        setLessons(data)
        if (data[0]) await openLesson(data[0], u.id)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    boot()
  }, [])

  const currentIndex = session?.current_index || 0
  const item = lesson?.items?.[currentIndex]
  const progress = session?.total_count ? (currentIndex / session.total_count) * 100 : 0
  const currentLesson = lesson || lessons[0]
  const langCode = currentLesson?.language_code || currentLesson?.language || 'de'

  async function openLesson(lessonSummary, userId = user?.id) {
    setBusy(true)
    setError(null)
    setSummary(null)
    setFeedback(null)
    setSelected(null)
    setBuilt([])
    setMatched({})
    try {
      const full = await apiFetch(`/exercise-lessons/${lessonSummary.id}`)
      const started = await startExerciseSession(lessonSummary.id, userId || user?.id || 1)
      setLesson(full)
      setSession(started)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const normalizedPayload = useMemo(() => {
    if (!item) return null
    if (item.type === 'choice') return selected
    if (item.type === 'build') return built
    if (item.type === 'match') return matched
    return selected
  }, [item, selected, built, matched])

  const canCheck = useMemo(() => {
    if (!item) return false
    if (item.type === 'choice') return !!selected
    if (item.type === 'build') return built.length === (answerValue(item.answer)?.length || 0)
    if (item.type === 'match') return Object.keys(matched).length === matchPairs(item).length
    return false
  }, [item, selected, built, matched])

  function resetExerciseState() {
    setFeedback(null)
    setSelected(null)
    setBuilt([])
    setMatched({})
  }

  async function check() {
    if (!item || !session) return
    setBusy(true)
    try {
      const result = await answerExerciseSession(session.id, { item_id: item.id, payload: normalizedPayload })
      setSession(result.session)
      setFeedback(result.is_correct ? { type: 'correct', explanation: result.explanation } : { type: 'wrong', explanation: result.explanation })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    resetExerciseState()
    if (session?.current_index >= session?.total_count) {
      await finish()
    }
  }

  async function finish() {
    if (!session) return
    setBusy(true)
    try {
      const done = await completeExerciseSession(session.id)
      setSummary(done)
      setSession(done.session)
      const refreshed = await loadExerciseLessons(user?.id || 1)
      setLessons(refreshed)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function restart() {
    if (!currentLesson) return
    await openLesson(currentLesson)
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-polyglot-accent" size={42} /></div>
  }

  if (error) {
    return <div className="card border-red-500/30 bg-red-500/10 text-red-200">Erro: {error}</div>
  }

  if (summary) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="card text-center py-12">
          <Trophy className="mx-auto mb-4 text-polyglot-gold" size={72} />
          <h1 className="text-3xl font-bold mb-2">Lição persistida!</h1>
          <p className="text-gray-300 mb-2">Você acertou {summary.correct_count} de {summary.total_count}.</p>
          <p className="text-polyglot-gold text-2xl font-bold mb-6">+{summary.xp_earned} XP gravados</p>
          <button className="btn-primary inline-flex items-center gap-2" onClick={restart} disabled={busy}>
            <RotateCcw size={18} /> Refazer/continuar lição
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🎮 Exercícios longos</h1>
        <p className="text-gray-400">Lições persistentes com 12 questões por idioma, vidas, XP real e progresso salvo no backend.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {lessons.map((l) => {
          const code = l.language_code || l.language
          return (
            <button key={l.id} disabled={busy} onClick={() => openLesson(l)} className={`card p-4 text-left transition-all ${lesson?.id === l.id ? 'ring-2 ring-polyglot-accent' : 'hover:bg-white/5'}`}>
              <div className="flex items-center gap-3">
                <LanguageFlag code={code} className="h-10 w-10" />
                <div>
                  <div className="font-bold">{l.language_name}</div>
                  <div className="text-xs text-gray-400">{LANG_META[code]?.accent || 'Lição'} · {l.items_count} questões</div>
                  <div className="text-xs text-polyglot-green">{l.completed_sessions} concluídas · melhor {l.best_score}/{l.items_count}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {item && session && (
        <div className="card">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-1 progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            <div className="flex items-center gap-1 text-red-400">
              {Array.from({ length: session.hearts_start || 5 }).map((_, i) => <Heart key={i} size={20} className={i < session.hearts_left ? 'fill-current' : 'opacity-25'} />)}
            </div>
          </div>

          <div className="mb-6 flex items-center gap-3">
            <LanguageFlag code={langCode} className="h-12 w-12" />
            <div>
              <p className="text-sm text-gray-400">{lesson.language_name} · questão {currentIndex + 1}/{session.total_count} · {session.xp_earned} XP na sessão</p>
              <h2 className="text-2xl font-bold">{item.prompt}</h2>
            </div>
            <button className="ml-auto btn-secondary" title="Ouvir exemplo"><Volume2 size={18} /></button>
          </div>

          {item.type === 'choice' && <Choice item={item} selected={selected} setSelected={setSelected} />}
          {item.type === 'build' && <Build item={item} built={built} setBuilt={setBuilt} />}
          {item.type === 'match' && <Match item={item} matched={matched} setMatched={setMatched} />}

          <div className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-gray-300"><strong>Dica:</strong> {item.hint}</div>

          {feedback && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 rounded-xl p-4 ${feedback.type === 'correct' ? 'bg-polyglot-green/20 text-polyglot-green' : 'bg-red-500/20 text-red-300'}`}>
              <div className="flex items-center gap-2 font-bold">{feedback.type === 'correct' ? <Check size={20} /> : <X size={20} />}{feedback.type === 'correct' ? 'Correto!' : 'Quase! Tente de novo.'}</div>
              {feedback.explanation && <p className="mt-2 text-sm opacity-90">{feedback.explanation}</p>}
            </motion.div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            {feedback?.type === 'wrong' && <button className="btn-secondary" onClick={resetExerciseState}>Tentar novamente</button>}
            {!feedback && <button className="btn-primary disabled:opacity-40" disabled={!canCheck || busy} onClick={check}>{busy ? 'Salvando...' : 'Verificar'}</button>}
            {feedback?.type === 'correct' && (session.current_index >= session.total_count ? <button className="btn-primary" onClick={finish}>Concluir e salvar XP</button> : <button className="btn-primary inline-flex items-center gap-2" onClick={next}>Continuar <ArrowRight size={18} /></button>)}
          </div>
        </div>
      )}
    </div>
  )
}

function Choice({ item, selected, setSelected }) {
  return <div className="grid gap-3 sm:grid-cols-2">{(item.options || []).map((option) => <button key={option} onClick={() => setSelected(option)} className={`rounded-xl border p-4 text-left text-lg font-semibold transition ${selected === option ? 'border-polyglot-accent bg-polyglot-accent/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>{option}</button>)}</div>
}

function Build({ item, built, setBuilt }) {
  const target = answerValue(item.answer) || []
  const tiles = item.tiles?.length ? item.tiles : shuffle(target)
  return <div className="space-y-4"><div className="min-h-16 rounded-xl border border-dashed border-white/20 bg-white/5 p-4">{built.length === 0 ? <span className="text-gray-500">Toque nas palavras para montar a frase...</span> : built.map((word, i) => <button key={`${word}-${i}`} onClick={() => setBuilt(built.filter((_, idx) => idx !== i))} className="mr-2 mb-2 rounded-lg bg-polyglot-accent px-3 py-2 font-semibold">{word}</button>)}</div><div className="flex flex-wrap gap-2">{tiles.map((tile, i) => <button key={`${tile}-${i}`} disabled={built.includes(tile)} onClick={() => setBuilt([...built, tile])} className="rounded-lg bg-white/10 px-4 py-3 font-semibold hover:bg-white/20 disabled:opacity-30">{tile}</button>)}</div></div>
}

function Match({ item, matched, setMatched }) {
  const pairs = matchPairs(item)
  const rights = pairs.map(([, right]) => right)
  return <div className="grid gap-3 md:grid-cols-2">{pairs.map(([left]) => <div key={left} className="rounded-xl bg-white/5 p-4"><div className="mb-3 text-xl font-bold">{left}</div><div className="flex flex-wrap gap-2">{rights.map((right) => <button key={right} onClick={() => setMatched({ ...matched, [left]: right })} className={`rounded-lg px-3 py-2 text-sm font-semibold ${matched[left] === right ? 'bg-polyglot-accent' : 'bg-white/10 hover:bg-white/20'}`}>{right}</button>)}</div></div>)}</div>
}
