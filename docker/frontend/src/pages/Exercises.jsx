import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Heart, X, Volume2, RotateCcw, Trophy, ArrowRight, Loader2, Star } from 'lucide-react'
import LanguageFlag from '../components/LanguageFlag'
import { answerExerciseSession, bootstrapUser, completeExerciseSession, loadExerciseLessons, loadExercisePath, startExerciseSession, apiFetch } from '../lib/api'
import { buildTilesForItem, matchRightOptions, stableShuffleOptions } from '../lib/exerciseOptions.mjs'

const LANG_META = {
  de: { accent: 'Rammstein', color: 'from-red-600 to-red-900' },
  fr: { accent: 'Chanson', color: 'from-blue-600 to-blue-900' },
  ru: { accent: 'Cirílico', color: 'from-yellow-600 to-yellow-900' },
  jp: { accent: 'Anime/Manga', color: 'from-pink-600 to-pink-900' },
  en: { accent: 'Pop/Internet', color: 'from-emerald-600 to-emerald-900' },
}

function answerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  return answer
}

function readableAnswer(value) {
  if (value == null) return '—'
  if (Array.isArray(value)) return value.join(' ')
  if (typeof value === 'object') {
    if ('value' in value) return readableAnswer(value.value)
    if ('pairs' in value && Array.isArray(value.pairs)) return value.pairs.map(([left, right]) => `${left} = ${right}`).join('; ')
    return Object.entries(value).map(([left, right]) => `${left} = ${right}`).join('; ')
  }
  return String(value)
}

function matchPairs(item) {
  if (Array.isArray(item.pairs)) return item.pairs
  if (item.answer?.pairs) return item.answer.pairs
  if (item.answer && typeof item.answer === 'object') return Object.entries(item.answer)
  return []
}

export default function Exercises() {
  const [user, setUser] = useState(null)
  const [lessons, setLessons] = useState([])
  const [pathData, setPathData] = useState([])
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
        setPathData(await loadExercisePath(u.id))
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
  const sessionItems = session?.items?.length ? session.items : (lesson?.items || [])
  const currentItem = sessionItems?.[currentIndex]
  const item = feedback?.itemSnapshot || currentItem
  const displayIndex = feedback?.answeredIndex ?? currentIndex
  const progress = session?.total_count ? (currentIndex / session.total_count) * 100 : 0
  const langCode = lesson?.language_code || lesson?.language || 'de'
  const activePath = pathData.find((p) => (p.language_code || p.language) === langCode)

  function resetExerciseState() {
    setFeedback(null)
    setSelected(null)
    setBuilt([])
    setMatched({})
  }

  async function openLesson(lessonSummary, userId = user?.id) {
    setBusy(true)
    setError(null)
    setSummary(null)
    setLesson(null)
    setSession(null)
    resetExerciseState()
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

  async function check() {
    if (!item || !session) return
    setBusy(true)
    try {
      const result = await answerExerciseSession(session.id, { item_id: item.id, payload: normalizedPayload })
      setSession(result.session)
      setFeedback(result.is_correct ? { type: 'correct', explanation: result.explanation, itemSnapshot: item, answeredIndex: currentIndex } : { type: 'wrong', explanation: result.explanation, correctAnswer: result.correct_answer, mistake: result.mistake_feedback, itemSnapshot: item, answeredIndex: currentIndex })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    resetExerciseState()
    if (session?.current_index >= session?.total_count) await finish()
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
      setPathData(await loadExercisePath(user?.id || 1))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function restart() {
    const current = lessons.find((l) => l.id === lesson?.id) || lessons[0]
    if (current) await openLesson(current)
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-polyglot-accent" size={42} /></div>
  if (error) return <div className="card border-red-500/30 bg-red-500/10 text-red-200">Erro: {error}</div>

  if (summary) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="card text-center py-12">
          <Trophy className="mx-auto mb-4 text-polyglot-gold" size={72} />
          <h1 className="text-3xl font-bold mb-2">Sessão concluída!</h1>
          <p className="text-gray-300 mb-2">Você acertou {summary.correct_count} de {summary.total_count}.</p>
          <p className="text-polyglot-gold text-2xl font-bold mb-6">+{summary.xp_earned} XP gravados</p>
          <button className="btn-primary inline-flex items-center gap-2" onClick={restart} disabled={busy}>
            <RotateCcw size={18} /> Próxima sessão de 10 questões
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🎮 Exercícios por trilha</h1>
        <p className="text-gray-400">100 questões por idioma, separadas em 10 temas de estudo. Cada sessão tem 10 perguntas para manter o ritmo rápido.</p>
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
                  <div className="text-xs text-polyglot-green">{l.completed_sessions}/{l.total_sessions} sessões · 10 por sessão</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {activePath && <SkillTrail path={activePath} />}

      {item && session && lesson && (
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
              <p className="text-sm text-gray-400">{lesson.language_name} · questão {displayIndex + 1}/{session.total_count} · {session.xp_earned} XP na sessão</p>
              <h2 className="text-2xl font-bold">{item.prompt}</h2>
            </div>
            <button className="ml-auto btn-secondary" title="Ouvir exemplo"><Volume2 size={18} /></button>
          </div>

          {item.type === 'choice' && <Choice item={item} selected={selected} onInteract={() => setFeedback(null)} setSelected={setSelected} />}
          {item.type === 'build' && <Build item={item} built={built} onInteract={() => setFeedback(null)} setBuilt={setBuilt} />}
          {item.type === 'match' && <Match item={item} matched={matched} onInteract={() => setFeedback(null)} setMatched={setMatched} />}

          <div className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-gray-300"><strong>Dica:</strong> {item.hint}</div>

          {feedback && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 rounded-xl p-4 ${feedback.type === 'correct' ? 'bg-polyglot-green/20 text-polyglot-green' : 'bg-red-500/20 text-red-300'}`}>
              <div className="flex items-center gap-2 font-bold">{feedback.type === 'correct' ? <Check size={20} /> : <X size={20} />}{feedback.type === 'correct' ? 'Correto!' : 'Marcado como erro — veja a correção antes de seguir.'}</div>
              {feedback.type === 'wrong' && (
                <div className="mt-3 space-y-2 rounded-lg bg-black/20 p-3 text-sm text-red-100">
                  <p><strong>Sua resposta:</strong> {readableAnswer(feedback.mistake?.your_answer)}</p>
                  <p><strong>Resposta correta:</strong> {readableAnswer(feedback.mistake?.correct_answer || feedback.correctAnswer)}</p>
                  {feedback.mistake?.message && <p className="opacity-90">{feedback.mistake.message}</p>}
                </div>
              )}
              {feedback.explanation && <p className="mt-2 text-sm opacity-90"><strong>Explicação:</strong> {feedback.explanation}</p>}
            </motion.div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            {!feedback && <button className="btn-primary disabled:opacity-40" disabled={!canCheck || busy} onClick={check}>{busy ? 'Salvando...' : 'Verificar'}</button>}
            {feedback?.type === 'wrong' && (session.current_index >= session.total_count ? <button className="btn-primary" onClick={finish}>Concluir e salvar XP</button> : <button className="btn-primary inline-flex items-center gap-2" onClick={next}>Entendi, continuar <ArrowRight size={18} /></button>)}
            {feedback?.type === 'correct' && (session.current_index >= session.total_count ? <button className="btn-primary" onClick={finish}>Concluir e salvar XP</button> : <button className="btn-primary inline-flex items-center gap-2" onClick={next}>Continuar <ArrowRight size={18} /></button>)}
          </div>
        </div>
      )}
    </div>
  )
}

function SkillTrail({ path }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Trilha de níveis — {path.language_name}</h3>
          <p className="text-sm text-gray-400">Inspirado em skill paths: cada nó é uma sessão de 10 questões.</p>
        </div>
        <span className="rounded-full bg-polyglot-accent/20 px-3 py-1 text-sm text-polyglot-accent">{path.completed_sessions}/{path.total_sessions}</span>
      </div>
      <div className="grid grid-cols-5 gap-4 md:grid-cols-10">
        {path.nodes.map((node, i) => (
          <div key={node.number} className="flex flex-col items-center gap-2">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${node.status === 'completed' ? 'border-polyglot-green bg-polyglot-green/20 text-polyglot-green' : node.status === 'current' ? 'border-polyglot-accent bg-polyglot-accent/20 text-polyglot-accent animate-pulse' : 'border-white/10 bg-white/5 text-gray-500'}`}>
              {node.status === 'completed' ? '✓' : <Star size={18} />}
            </div>
            <span className="text-xs text-gray-400">{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Choice({ item, selected, setSelected, onInteract }) {
  const options = stableShuffleOptions(item.options || [], item.id ?? item.prompt)
  return <div className="grid gap-3 sm:grid-cols-2">{options.map((option) => <button key={option} onClick={() => { onInteract(); setSelected(option) }} className={`rounded-xl border p-4 text-left text-lg font-semibold transition ${selected === option ? 'border-polyglot-accent bg-polyglot-accent/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>{option}</button>)}</div>
}

function Build({ item, built, setBuilt, onInteract }) {
  const tiles = buildTilesForItem(item)
  return <div className="space-y-4"><div className="min-h-16 rounded-xl border border-dashed border-white/20 bg-white/5 p-4">{built.length === 0 ? <span className="text-gray-500">Toque nas palavras para montar a frase...</span> : built.map((word, i) => <button key={`${word}-${i}`} onClick={() => { onInteract(); setBuilt(built.filter((_, idx) => idx !== i)) }} className="mr-2 mb-2 rounded-lg bg-polyglot-accent px-3 py-2 font-semibold">{word}</button>)}</div><div className="flex flex-wrap gap-2">{tiles.map((tile, i) => <button key={`${tile}-${i}`} disabled={built.includes(tile)} onClick={() => { onInteract(); setBuilt([...built, tile]) }} className="rounded-lg bg-white/10 px-4 py-3 font-semibold hover:bg-white/20 disabled:opacity-30">{tile}</button>)}</div></div>
}

function Match({ item, matched, setMatched, onInteract }) {
  const pairs = matchPairs(item)
  const rights = matchRightOptions(item)
  return <div className="grid gap-3 md:grid-cols-2">{pairs.map(([left]) => <div key={left} className="rounded-xl bg-white/5 p-4"><div className="mb-3 text-xl font-bold">{left}</div><div className="flex flex-wrap gap-2">{rights.map((right) => <button key={right} onClick={() => { onInteract(); setMatched({ ...matched, [left]: right }) }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${matched[left] === right ? 'bg-polyglot-accent' : 'bg-white/10 hover:bg-white/20'}`}>{right}</button>)}</div></div>)}</div>
}
