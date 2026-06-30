import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Heart, X, Volume2, RotateCcw, Trophy, ArrowRight, Loader2, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import LanguageFlag from '../components/LanguageFlag'
import { answerExerciseSession, bootstrapUser, completeExerciseSession, loadExerciseLessons, loadExercisePath, startExerciseSession, apiFetch, synthesizeSpeech } from '../lib/api'
import { handleExerciseKeyDown } from '../lib/exerciseKeyboard.mjs'
import { buildTilesForItem, stableShuffleOptions } from '../lib/exerciseOptions.mjs'
import { speakSegmentsWithBrowser, voiceSegmentsForAnswerOnly, voiceSegmentsForFeedback, voiceSegmentsForItem } from '../lib/voiceMode.mjs'
import { createSpeechPlaybackController } from '../lib/speechPlayback.mjs'
import { buildExerciseFeedback } from '../lib/exerciseFeedback.mjs'
import { selectableImageChoiceOptions } from '../lib/imageChoice.mjs'
import { lessonContextForExercise } from '../lib/exerciseLessonContext.mjs'
import { hintForExerciseType } from '../lib/exerciseTypeHint.mjs'
import { choiceShortcutLabels } from '../lib/exerciseChoiceShortcuts.mjs'
import { exerciseSessionProgress } from '../lib/exerciseSessionProgress.mjs'
import { filterExerciseLessonsByLanguage, summarizeExerciseLessonProgressByLanguage } from '../lib/exerciseLessonFilters.mjs'
import { reorderBuiltWords } from '../lib/buildWordOrder.mjs'
import { cleanExercisePrompt, isTrailSessionEnabled, pageForSessionNumber, sessionWindowForPage, trailConnectorStateClasses, trailHeaderLayoutClasses, trailNodeStateClasses } from '../lib/exerciseTrailLayout.mjs'
import { nextExerciseActionLabel, sessionNumberForExerciseSession } from '../lib/exerciseSessionLabels.mjs'
import { parseMicroDialoguePrompt } from '../lib/microDialoguePrompt.mjs'
import { playAnswerFeedbackSound, unlockAnswerFeedbackSound } from '../lib/answerFeedbackSound.mjs'
import { playSessionCompletionFanfare, unlockSessionCompletionFanfare } from '../lib/sessionCompletionFanfare.mjs'
import { buildLetterScramblePayload, isLetterScrambleEligible, singleWordBuildAnswer, stableScrambleLetters } from '../lib/letterScramble.mjs'
import { buildMemoryMatchCards, memoryMatchSelection } from '../lib/memoryMatch.mjs'
import { buildListenBuildDictationPayload, canSubmitListenBuildDictation } from '../lib/listenBuildDictation.mjs'
import { sequenceDialogueCanSubmit, sequenceDialoguePayload } from '../lib/sequenceDialogue.mjs'
import { eligibleWordSearchWords, generateWordSearchGrid, updateFoundWordSearchWords, validateWordSearchSelection, wordSearchSeed } from '../lib/wordSearch.mjs'
import { eligibleLetterBlockWords, generateLetterBlocksPuzzle, validateLetterBlocksPath, updateFoundLetterBlockWords, letterBlocksSeed } from '../lib/letterBlocks.mjs'
import { buildTypingRushQueue, validateTypingRushAnswer, typingRushPrompt } from '../lib/typingRush.mjs'
import { buildClozeRushQueue, validateClozeRushSelection, clozeRushPrompt } from '../lib/clozeRush.mjs'
import { buildArticleBlitzQueue, validateArticleBlitzSelection, ARTICLE_BLITZ_OPTIONS } from '../lib/articleBlitz.mjs'

const LANG_META = {
  de: { accent: 'Rammstein', color: 'from-red-600 to-red-900' },
  fr: { accent: 'Chanson', color: 'from-blue-600 to-blue-900' },
  ru: { accent: 'Cirílico', color: 'from-yellow-600 to-yellow-900' },
  jp: { accent: 'Anime/Manga', color: 'from-pink-600 to-pink-900' },
  en: { accent: 'Pop/Internet', color: 'from-emerald-600 to-emerald-900' },
}

const LESSON_LANGUAGE_FILTERS = [
  { code: 'all', label: 'Todos' },
  { code: 'de', label: 'Alemão' },
  { code: 'fr', label: 'Francês' },
  { code: 'ru', label: 'Russo' },
  { code: 'jp', label: 'Japonês' },
  { code: 'en', label: 'Inglês' },
]

const BUILD_LIKE_TYPES = ['build', 'listen_build']
const ANSWER_FEEDBACK_SPEECH_DELAY_MS = 420

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
  const [typedAnswer, setTypedAnswer] = useState('')
  const [summary, setSummary] = useState(null)
  const [voiceMode, setVoiceMode] = useState(false)
  const [lessonLanguageFilter, setLessonLanguageFilter] = useState('all')
  const [trailPage, setTrailPage] = useState(0)
  const [mobileTrailPage, setMobileTrailPage] = useState(0)
  const speechPlaybackRef = useRef(null)
  if (!speechPlaybackRef.current) {
    speechPlaybackRef.current = createSpeechPlaybackController({
      synthesizeSpeech,
      fallbackSpeakSegments: speakSegmentsWithBrowser,
    })
  }

  useEffect(() => {
    return () => speechPlaybackRef.current?.stop()
  }, [])

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
  const sessionProgress = useMemo(() => exerciseSessionProgress(session), [session])
  const langCode = lesson?.language_code || lesson?.language || 'de'
  const activePath = pathData.find((p) => (p.language_code || p.language) === langCode)
  const choiceLikeTypes = ['choice', 'listen_choice', 'context_choice', 'image_choice']
  const choiceOptions = useMemo(() => (choiceLikeTypes.includes(item?.type) ? stableShuffleOptions(item.options || [], item.id ?? item.prompt) : []), [item])
  const lessonContext = useMemo(() => lessonContextForExercise(lesson), [lesson])
  const lessonLanguageProgress = useMemo(() => summarizeExerciseLessonProgressByLanguage(lessons), [lessons])
  const filteredLessons = useMemo(() => filterExerciseLessonsByLanguage(lessons, lessonLanguageFilter), [lessons, lessonLanguageFilter])
  const currentSessionNumber = sessionNumberForExerciseSession(session, activePath)
  const microDialogue = useMemo(() => (item?.type === 'context_choice' ? parseMicroDialoguePrompt(item.prompt) : null), [item])
  const isUsingListenBuildDictation = item?.type === 'listen_build' && typedAnswer.trim().length > 0

  useEffect(() => {
    if (activePath) {
      setTrailPage(pageForSessionNumber(currentSessionNumber, 5))
      setMobileTrailPage(pageForSessionNumber(currentSessionNumber, 3))
    }
  }, [activePath?.language_code, currentSessionNumber])

  function resetExerciseState() {
    setSummary(null)
    setFeedback(null)
    setSelected(null)
    setBuilt([])
    setMatched({})
    setTypedAnswer('')
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

  async function openSessionNumber(sessionNumber) {
    if (!lesson?.id || !activePath || sessionNumber > activePath.completed_sessions + 1) return
    setBusy(true)
    setError(null)
    resetExerciseState()
    try {
      const started = await startExerciseSession(lesson.id, user?.id || 1, sessionNumber)
      setSession(started)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const normalizedPayload = useMemo(() => {
    if (!item) return null
    if (['choice', 'listen_choice', 'context_choice'].includes(item.type)) return selected
    if (item.type === 'image_choice') return selected
    if (isUsingListenBuildDictation) return buildListenBuildDictationPayload(typedAnswer)
    if (item.type === 'sequence_dialogue') return sequenceDialoguePayload(built)
    if (BUILD_LIKE_TYPES.includes(item.type)) return isLetterScrambleEligible(item) ? buildLetterScramblePayload(built) : built
    if (item.type === 'match') return matched
    return selected
  }, [item, selected, built, matched, typedAnswer, isUsingListenBuildDictation])

  const canCheck = useMemo(() => {
    if (!item) return false
    if (['choice', 'listen_choice', 'context_choice'].includes(item.type)) return !!selected
    if (item.type === 'image_choice') return !!selected
    if (isUsingListenBuildDictation) return canSubmitListenBuildDictation(item, typedAnswer)
    if (item.type === 'sequence_dialogue') return sequenceDialogueCanSubmit(item, built)
    if (BUILD_LIKE_TYPES.includes(item.type)) {
      if (isLetterScrambleEligible(item)) return built.length === singleWordBuildAnswer(item).length
      return built.length === (answerValue(item.answer)?.length || 0)
    }
    if (item.type === 'match') return Object.keys(matched).length === matchPairs(item).length
    return false
  }, [item, selected, built, matched, typedAnswer, isUsingListenBuildDictation])

  async function check() {
    if (!item || !session) return
    unlockAnswerFeedbackSound()
    setBusy(true)
    try {
      const result = await answerExerciseSession(session.id, { item_id: item.id, payload: normalizedPayload })
      const nextFeedback = buildExerciseFeedback(result, item, currentIndex)
      setSession(result.session)
      setFeedback(nextFeedback)
      playAnswerFeedbackSound(nextFeedback.type)
      setTimeout(() => speakCurrent(voiceSegmentsForFeedback(nextFeedback, langCode)), ANSWER_FEEDBACK_SPEECH_DELAY_MS)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    resetExerciseState()
    if (session?.current_index >= session?.total_count) {
      unlockSessionCompletionFanfare()
      await finish(true)
      return
    }
  }

  async function finish(continueNext = false) {
    if (!session) return
    setBusy(true)
    try {
      const done = await completeExerciseSession(session.id)
      setSession(done.session)
      const refreshed = await loadExerciseLessons(user?.id || 1)
      setLessons(refreshed)
      setPathData(await loadExercisePath(user?.id || 1))
      if (continueNext) {
        playSessionCompletionFanfare()
        const currentLesson = refreshed.find((l) => l.id === lesson?.id) || lessons.find((l) => l.id === lesson?.id) || lesson
        if (currentLesson?.id) {
          const started = await startExerciseSession(currentLesson.id, user?.id || 1)
          const full = await apiFetch(`/exercise-lessons/${currentLesson.id}`)
          resetExerciseState()
          setLesson(full)
          setSession(started)
          setSummary(null)
          return
        }
      }
      setSummary(done)
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

  function speakCurrent(segments = voiceSegmentsForItem(item, langCode)) {
    speechPlaybackRef.current?.speakSegments(segments)
  }

  function replayCurrentAudio() {
    speakCurrent(feedback ? voiceSegmentsForFeedback(feedback, langCode) : voiceSegmentsForItem(item, langCode))
  }

  useEffect(() => {
    if (voiceMode && item && !feedback) speakCurrent()
  }, [voiceMode, item?.id, feedback])

  useEffect(() => {
    function onKeyDown(event) {
      handleExerciseKeyDown(event, {
        hasItem: !!item && !!session,
        busy,
        choiceOptions,
        canCheck,
        hasFeedback: !!feedback,
        selectChoice: (option) => {
          setFeedback(null)
          setSelected(typeof option === 'object' && option?.value ? option.value : option)
        },
        check,
        next,
        clear: resetExerciseState,
        speakCurrent: replayCurrentAudio,
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [item, session, busy, choiceOptions, canCheck, feedback])

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-polyglot-accent" size={42} /></div>
  if (error) return <div className="card border-red-500/30 bg-red-500/10 text-red-200">Erro: {error}</div>

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🎮 Exercícios por trilha</h1>
        <p className="text-gray-400">1000 questões por idioma: 10 unidades situacionais, 10 tópicos por unidade e 10 perguntas por tópico. Cada sessão continua com 10 perguntas para manter o ritmo rápido.</p>
      </div>

      {summary && (
        <div className="card border-polyglot-gold/30 bg-polyglot-gold/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Trophy className="text-polyglot-gold" size={48} />
              <div>
                <h2 className="text-2xl font-bold">Sessão concluída!</h2>
                <p className="text-gray-300">Você acertou {summary.correct_count} de {summary.total_count} · +{summary.xp_earned} XP gravados</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setSummary(null)}>Fechar resumo</button>
              <button className="btn-primary inline-flex items-center gap-2" onClick={restart} disabled={busy}>
                <RotateCcw size={18} /> Próxima sessão
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {LESSON_LANGUAGE_FILTERS.map((filter) => {
          const progressSummary = lessonLanguageProgress[filter.code] || { label: '0/0 sessões' }
          return (
            <button
              key={filter.code}
              type="button"
              onClick={() => setLessonLanguageFilter(filter.code)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${lessonLanguageFilter === filter.code ? 'border-polyglot-accent bg-polyglot-accent/20 text-polyglot-accent' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}
            >
              <span>{filter.label}</span>
              <span className="ml-2 text-xs font-medium opacity-75">· {progressSummary.label}</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filteredLessons.map((l) => {
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

      {activePath && <SkillTrail path={activePath} lessonContext={lessonContext} page={trailPage} mobilePage={mobileTrailPage} onPageChange={setTrailPage} onMobilePageChange={setMobileTrailPage} currentSessionNumber={currentSessionNumber} onSessionClick={openSessionNumber} />}

      {item && session && lesson && (
        <div className="card">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-1 progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            <div className="flex items-center gap-1 text-red-400">
              {Array.from({ length: session.hearts_start || 5 }).map((_, i) => <Heart key={i} size={20} className={i < session.hearts_left ? 'fill-current' : 'opacity-25'} />)}
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ProgressStat label="Respondidas" value={`${sessionProgress.answered}/${sessionProgress.total}`} />
            <ProgressStat label="Sessão" value={`${currentSessionNumber}/${activePath?.total_sessions || lesson?.total_sessions || '—'}`} />
            <ProgressStat label="Faltam" value={sessionProgress.remaining} />
            <ProgressStat label="Acerto parcial" value={`${sessionProgress.correct}/${sessionProgress.answered}`} detail={`${sessionProgress.accuracyPercent}%`} />
          </div>

          <div className="mb-6 flex items-center gap-3">
            <LanguageFlag code={langCode} className="h-12 w-12" />
            <div>
              <p className="text-sm text-gray-400">{lesson.language_name} · questão {displayIndex + 1}/{session.total_count} · {session.xp_earned} XP na sessão</p>
              <p className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-polyglot-accent">{hintForExerciseType(item.type)}</p>
              <h2 className="text-2xl font-bold">{cleanExercisePrompt(item.prompt, item.answer)}</h2>
            </div>
            <div className="ml-auto flex gap-2">
              <button className="btn-secondary" title="Ouvir pergunta/correção" onClick={replayCurrentAudio}><Volume2 size={18} /></button>
              <button className={`btn-secondary text-xs ${voiceMode ? 'ring-2 ring-polyglot-accent' : ''}`} onClick={() => setVoiceMode(!voiceMode)}>{voiceMode ? 'Voz ligada' : 'Modo voz'}</button>
            </div>
          </div>


          {microDialogue && <MicroDialoguePrompt dialogue={microDialogue} />}

          {['choice', 'listen_choice', 'context_choice'].includes(item.type) && <Choice options={choiceOptions} selected={selected} onInteract={() => setFeedback(null)} setSelected={setSelected} />}
          {item.type === 'image_choice' && <ImageChoice options={choiceOptions} selected={selected} onInteract={() => setFeedback(null)} setSelected={setSelected} />}
          {item.type === 'listen_build' && <ListenBuildDictation typedAnswer={typedAnswer} setTypedAnswer={setTypedAnswer} onInteract={() => setFeedback(null)} onSubmit={check} canSubmit={canCheck} busy={busy} />}
          {item.type === 'sequence_dialogue' && <SequenceDialogue item={item} built={built} onInteract={() => setFeedback(null)} setBuilt={setBuilt} />}
          {BUILD_LIKE_TYPES.includes(item.type) && <Build item={item} built={built} onInteract={() => setFeedback(null)} setBuilt={setBuilt} />}
          {item.type === 'match' && <Match item={item} matched={matched} onInteract={() => setFeedback(null)} setMatched={setMatched} />}

          <div className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-gray-300"><strong>Dica:</strong> {item.hint}</div>
          <div className="mt-3 text-xs text-gray-500">Atalhos: 1-4 selecionar · O ouvir · Enter verificar/continuar · Esc limpar</div>

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
            {feedback && <button className="btn-secondary inline-flex items-center gap-2" onClick={() => speakCurrent(voiceSegmentsForAnswerOnly(feedback, langCode))}><Volume2 size={18} /> Repetir resposta</button>}
            {feedback?.type === 'wrong' && (session.current_index >= session.total_count ? <button className="btn-primary inline-flex items-center gap-2" onClick={() => finish(true)}>{nextExerciseActionLabel(session)} <ArrowRight size={18} /></button> : <button className="btn-primary inline-flex items-center gap-2" onClick={next}>Entendi, continuar <ArrowRight size={18} /></button>)}
            {feedback?.type === 'correct' && (session.current_index >= session.total_count ? <button className="btn-primary inline-flex items-center gap-2" onClick={() => finish(true)}>{nextExerciseActionLabel(session)} <ArrowRight size={18} /></button> : <button className="btn-primary inline-flex items-center gap-2" onClick={next}>{nextExerciseActionLabel(session)} <ArrowRight size={18} /></button>)}
          </div>

          <TypingRushPractice items={sessionItems} lesson={lesson} session={session} currentIndex={currentIndex} />
          <ArticleBlitzPractice items={sessionItems} lesson={lesson} session={session} currentIndex={currentIndex} />
          <ClozeRushPractice items={sessionItems} lesson={lesson} session={session} currentIndex={currentIndex} />
          <WordSearchPractice items={sessionItems} lesson={lesson} session={session} currentIndex={currentIndex} />
          <LetterBlocksPractice items={sessionItems} lesson={lesson} session={session} currentIndex={currentIndex} />
        </div>
      )}
    </div>
  )
}

function ArticleBlitzPractice({ items, lesson, session, currentIndex }) {
  const queue = useMemo(() => buildArticleBlitzQueue(items, { lesson, session, currentIndex }), [items, lesson, session, currentIndex])
  const [cardIndex, setCardIndex] = useState(0)
  const [selectedArticle, setSelectedArticle] = useState('')
  const [result, setResult] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)

  useEffect(() => {
    setCardIndex(0)
    setSelectedArticle('')
    setResult(null)
    setCorrectCount(0)
  }, [queue.map((card) => card.seed).join('|')])

  if (queue.length < 4) return null

  const card = queue[cardIndex % queue.length]

  function chooseArticle(article) {
    setSelectedArticle(article)
    setResult(null)
  }

  function verify() {
    const nextResult = validateArticleBlitzSelection(selectedArticle, card)
    setResult(nextResult)
    if (nextResult.status === 'correct') setCorrectCount((count) => count + 1)
  }

  function nextCard() {
    setCardIndex((index) => (index + 1) % queue.length)
    setSelectedArticle('')
    setResult(null)
  }

  return (
    <div className="mt-8 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-polyglot-accent">Treino local: artigo relâmpago</p>
          <h3 className="mt-1 text-xl font-bold text-white">Escolha der, die ou das</h3>
          <p className="mt-1 text-sm text-gray-300">Recupere o artigo de substantivos alemães desta sessão. Este treino não altera XP/progresso.</p>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm font-semibold text-polyglot-accent">{correctCount} acertos</span>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Substantivo</p>
        <p className="mt-2 text-4xl font-black text-white">{card.noun}</p>
        {card.prompt && <p className="mt-2 text-sm text-gray-400">Dica da sessão: {card.prompt}</p>}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {ARTICLE_BLITZ_OPTIONS.map((article) => (
            <button
              key={article}
              type="button"
              onClick={() => chooseArticle(article)}
              className={`rounded-xl border px-4 py-3 text-lg font-black transition ${selectedArticle === article ? 'border-polyglot-accent bg-polyglot-accent/25 text-white' : 'border-white/10 bg-white/5 text-gray-200 hover:border-polyglot-accent/50 hover:bg-white/10'}`}
            >
              {article}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary disabled:opacity-40" disabled={!selectedArticle} onClick={verify}>Verificar</button>
          <button type="button" className="btn-secondary" onClick={nextCard}>Próxima</button>
        </div>
        {result && (
          <p className={`mt-3 rounded-lg p-3 text-sm font-semibold ${result.status === 'correct' ? 'bg-polyglot-green/15 text-polyglot-green' : 'bg-red-500/15 text-red-200'}`}>
            {result.status === 'correct' ? 'Correto — artigo recuperado.' : `Resposta esperada: ${result.fullAnswer}`}
          </p>
        )}
      </div>
    </div>
  )
}

function ClozeRushPractice({ items, lesson, session, currentIndex }) {
  const queue = useMemo(() => buildClozeRushQueue(items, { lesson, session, currentIndex }), [items, lesson, session, currentIndex])
  const [cardIndex, setCardIndex] = useState(0)
  const [selectedChip, setSelectedChip] = useState('')
  const [result, setResult] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)

  useEffect(() => {
    setCardIndex(0)
    setSelectedChip('')
    setResult(null)
    setCorrectCount(0)
  }, [queue.map((card) => card.seed).join('|')])

  if (queue.length < 2) return null

  const card = queue[cardIndex % queue.length]

  function chooseChip(chip) {
    setSelectedChip(chip)
    setResult(null)
  }

  function verify() {
    const nextResult = validateClozeRushSelection(selectedChip, card)
    setResult(nextResult)
    if (nextResult.status === 'correct') setCorrectCount((count) => count + 1)
  }

  function nextCard() {
    setCardIndex((index) => (index + 1) % queue.length)
    setSelectedChip('')
    setResult(null)
  }

  return (
    <div className="mt-8 rounded-2xl border border-purple-400/30 bg-purple-500/10 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-polyglot-accent">Treino local: lacuna relâmpago</p>
          <h3 className="mt-1 text-xl font-bold text-white">Complete a palavra que falta</h3>
          <p className="mt-1 text-sm text-gray-300">Escolha o chip ausente em frases desta sessão. Este treino não altera XP/progresso.</p>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm font-semibold text-polyglot-accent">{correctCount} acertos</span>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Contexto</p>
        <p className="mt-1 text-sm text-gray-300">{clozeRushPrompt(card.prompt, card.fullText)}</p>
        <p className="mt-4 rounded-xl bg-white/5 p-4 text-2xl font-black text-white">{card.clozeText}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {card.chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => chooseChip(chip)}
              className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${selectedChip === chip ? 'border-polyglot-accent bg-polyglot-accent/25 text-white' : 'border-white/10 bg-white/5 text-gray-200 hover:border-polyglot-accent/50 hover:bg-white/10'}`}
            >
              {chip}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary disabled:opacity-40" disabled={!selectedChip} onClick={verify}>Verificar</button>
          <button type="button" className="btn-secondary" onClick={nextCard}>Próxima</button>
        </div>
        {result && (
          <div className={`mt-3 rounded-lg p-3 text-sm font-semibold ${result.status === 'correct' ? 'bg-polyglot-green/15 text-polyglot-green' : 'bg-red-500/15 text-red-200'}`}>
            <p>{result.status === 'correct' ? 'Correto — lacuna completa.' : `Resposta esperada: ${result.expected}`}</p>
            <p className="mt-1 opacity-90">Frase completa: {result.fullText}</p>
            {card.explanation && <p className="mt-1 opacity-80">{card.explanation}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingRushPractice({ items, lesson, session, currentIndex }) {
  const queue = useMemo(() => buildTypingRushQueue(items, { lesson, session, currentIndex }), [items, lesson, session, currentIndex])
  const [cardIndex, setCardIndex] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)

  useEffect(() => {
    setCardIndex(0)
    setInput('')
    setResult(null)
    setCorrectCount(0)
  }, [queue.map((card) => card.seed).join('|')])

  if (queue.length < 2) return null

  const card = queue[cardIndex % queue.length]
  const feedbackText = {
    correct: 'Correto — boa recuperação ativa.',
    close: `Quase lá. Resposta esperada: ${result?.expected}`,
    wrong: `Resposta esperada: ${result?.expected}`,
  }

  function verify() {
    const nextResult = validateTypingRushAnswer(input, card.answer)
    setResult(nextResult)
    if (nextResult.status === 'correct') setCorrectCount((count) => count + 1)
  }

  function nextCard() {
    setCardIndex((index) => (index + 1) % queue.length)
    setInput('')
    setResult(null)
  }

  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-polyglot-accent">Treino local: digitação relâmpago</p>
          <h3 className="mt-1 text-xl font-bold text-white">Digite a resposta no idioma estudado</h3>
          <p className="mt-1 text-sm text-gray-300">Recuperação ativa com itens desta sessão. Este treino não altera XP/progresso.</p>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm font-semibold text-polyglot-accent">{correctCount} acertos</span>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Dica</p>
        <p className="mt-1 text-lg font-bold text-white">{typingRushPrompt(card.prompt, card.answer)}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              setResult(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && input.trim()) verify()
            }}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none focus:border-polyglot-accent"
            placeholder="Digite aqui..."
            aria-label="Resposta do treino de digitação relâmpago"
          />
          <button type="button" className="btn-primary disabled:opacity-40" disabled={!input.trim()} onClick={verify}>Verificar</button>
          <button type="button" className="btn-secondary" onClick={nextCard}>Próxima</button>
        </div>
        {result && (
          <p className={`mt-3 rounded-lg p-3 text-sm font-semibold ${result.status === 'correct' ? 'bg-polyglot-green/15 text-polyglot-green' : result.status === 'close' ? 'bg-yellow-500/15 text-yellow-200' : 'bg-red-500/15 text-red-200'}`}>
            {feedbackText[result.status]}
          </p>
        )}
      </div>
    </div>
  )
}

function ProgressStat({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {detail && <span className="text-sm font-semibold text-polyglot-accent">{detail}</span>}
      </div>
    </div>
  )
}

function MicroDialoguePrompt({ dialogue }) {
  return (
    <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="space-y-3">
        <div className="mr-8 rounded-2xl rounded-tl-sm bg-black/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{dialogue.partnerLabel}</p>
          <p className="mt-1 text-lg font-semibold text-white">{dialogue.partnerText}</p>
        </div>
        <div className="ml-8 rounded-2xl rounded-tr-sm border border-polyglot-accent/40 bg-polyglot-accent/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-polyglot-accent">{dialogue.learnerLabel}</p>
          <p className="mt-1 text-lg font-semibold text-white">{dialogue.learnerText}</p>
        </div>
      </div>
      {dialogue.instruction && <p className="mt-3 text-sm text-gray-300">{dialogue.instruction}</p>}
    </div>
  )
}

function WordSearchPractice({ items, lesson, session, currentIndex }) {
  const seed = wordSearchSeed({ lesson, session, currentIndex })
  const words = useMemo(() => eligibleWordSearchWords(items, 8), [items])
  const puzzle = useMemo(() => generateWordSearchGrid(words, seed), [words, seed])
  const [selectionStart, setSelectionStart] = useState(null)
  const [foundWords, setFoundWords] = useState([])

  useEffect(() => {
    setSelectionStart(null)
    setFoundWords([])
  }, [seed])

  if (words.length < 6) return null

  const foundSet = new Set(foundWords)
  const foundCells = new Set(
    foundWords.flatMap((word) => (puzzle.placements[word]?.cells || []).map((cell) => `${cell.row}:${cell.col}`)),
  )
  const isComplete = foundWords.length === words.length

  function chooseCell(point) {
    if (!selectionStart) {
      setSelectionStart(point)
      return
    }
    const result = validateWordSearchSelection({ placements: puzzle.placements, from: selectionStart, to: point })
    setFoundWords((current) => updateFoundWordSearchWords(current, result))
    setSelectionStart(null)
  }

  return (
    <div className="mt-8 rounded-2xl border border-polyglot-accent/30 bg-polyglot-accent/10 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-polyglot-accent">Treino local: caça-palavra</p>
          <h3 className="mt-1 text-xl font-bold text-white">Encontre palavras desta sessão</h3>
          <p className="mt-1 text-sm text-gray-300">Selecione a primeira e a última letra em linha reta. Este treino não altera XP/progresso.</p>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm font-semibold text-polyglot-accent">{foundWords.length}/{words.length}</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="grid w-fit gap-1" style={{ gridTemplateColumns: `repeat(${puzzle.grid.length}, minmax(2rem, 1fr))` }}>
            {puzzle.grid.map((row, rowIndex) => row.map((letter, colIndex) => {
              const key = `${rowIndex}:${colIndex}`
              const isSelectedStart = selectionStart?.row === rowIndex && selectionStart?.col === colIndex
              const isFound = foundCells.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => chooseCell({ row: rowIndex, col: colIndex })}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-black transition ${isFound ? 'border-polyglot-green/60 bg-polyglot-green/25 text-polyglot-green' : isSelectedStart ? 'border-polyglot-accent bg-polyglot-accent/30 text-white' : 'border-white/10 bg-white/5 text-white hover:border-polyglot-accent/50 hover:bg-white/10'}`}
                  aria-label={`Linha ${rowIndex + 1}, coluna ${colIndex + 1}, letra ${letter}`}
                >
                  {letter}
                </button>
              )
            }))}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-sm font-semibold text-gray-300">Palavras-alvo</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {words.map((word) => (
              <span key={word} className={`rounded-full border px-3 py-1 text-sm font-bold ${foundSet.has(word) ? 'border-polyglot-green/50 bg-polyglot-green/20 text-polyglot-green line-through' : 'border-white/10 bg-white/5 text-gray-300'}`}>{word}</span>
            ))}
          </div>
          {isComplete && <p className="mt-4 rounded-lg bg-polyglot-green/15 p-3 text-sm font-semibold text-polyglot-green">Treino concluído — isso não altera seu progresso.</p>}
        </div>
      </div>
    </div>
  )
}

function LetterBlocksPractice({ items, lesson, session, currentIndex }) {
  const seed = letterBlocksSeed({ lesson, session, currentIndex })
  const words = useMemo(() => eligibleLetterBlockWords(items, 5), [items])
  const puzzle = useMemo(() => generateLetterBlocksPuzzle(words, seed), [words, seed])
  const [path, setPath] = useState([])
  const [foundWords, setFoundWords] = useState([])
  const [result, setResult] = useState(null)

  useEffect(() => {
    setPath([])
    setFoundWords([])
    setResult(null)
  }, [seed])

  if (words.length < 3) return null

  const foundSet = new Set(foundWords)
  const selectedCells = new Set(path.map((point) => `${point.row}:${point.col}`))
  const foundCells = new Set(
    foundWords.flatMap((word) => (puzzle.paths[word] || []).map((cell) => `${cell.row}:${cell.col}`)),
  )
  const currentAttempt = path.map((point) => puzzle.grid[point.row][point.col]).join('')
  const isComplete = foundWords.length === puzzle.targets.length

  function resetSelection() {
    setPath([])
    setResult(null)
  }

  function restartGame() {
    setPath([])
    setFoundWords([])
    setResult(null)
  }

  function chooseCell(point) {
    setResult(null)
    if (path.some((cell) => cell.row === point.row && cell.col === point.col)) return
    if (path.length > 0) {
      const previous = path[path.length - 1]
      const distance = Math.abs(previous.row - point.row) + Math.abs(previous.col - point.col)
      if (distance !== 1) {
        setResult({ found: false, word: null, reason: 'not-adjacent' })
        return
      }
    }
    const nextPath = [...path, point]
    const nextResult = validateLetterBlocksPath({ grid: puzzle.grid, targets: puzzle.targets, path: nextPath })
    if (nextResult.found) {
      setFoundWords((current) => updateFoundLetterBlockWords(current, nextResult))
      setResult(nextResult)
      setPath([])
      return
    }
    setPath(nextPath)
  }

  return (
    <div className="mt-8 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-polyglot-accent">Treino local: blocos de letras</p>
          <h3 className="mt-1 text-xl font-bold text-white">Conecte letras vizinhas</h3>
          <p className="mt-1 text-sm text-gray-300">Clique em letras horizontais/verticais adjacentes para formar palavras da sessão. Este treino não altera XP/progresso.</p>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm font-semibold text-polyglot-accent">{foundWords.length}/{puzzle.targets.length}</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="grid w-fit gap-2" style={{ gridTemplateColumns: `repeat(${puzzle.grid.length}, minmax(2.5rem, 1fr))` }}>
            {puzzle.grid.map((row, rowIndex) => row.map((letter, colIndex) => {
              const key = `${rowIndex}:${colIndex}`
              const isSelected = selectedCells.has(key)
              const isFound = foundCells.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => chooseCell({ row: rowIndex, col: colIndex })}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border text-base font-black transition ${isFound ? 'border-polyglot-green/60 bg-polyglot-green/25 text-polyglot-green' : isSelected ? 'border-cyan-300 bg-cyan-300/25 text-white' : 'border-white/10 bg-white/5 text-white hover:border-cyan-300/60 hover:bg-white/10'}`}
                  aria-label={`Bloco linha ${rowIndex + 1}, coluna ${colIndex + 1}, letra ${letter}`}
                >
                  {letter}
                </button>
              )
            }))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200">Seleção: <strong className="text-white">{currentAttempt || '—'}</strong></span>
            <button type="button" className="btn-secondary" onClick={resetSelection}>Limpar seleção</button>
            <button type="button" className="btn-secondary" onClick={restartGame}>Reiniciar</button>
          </div>
          {result && (
            <p className={`mt-3 rounded-lg p-3 text-sm font-semibold ${result.found ? 'bg-polyglot-green/15 text-polyglot-green' : 'bg-red-500/15 text-red-200'}`}>
              {result.found ? `Encontrou: ${result.word}` : 'Use apenas letras vizinhas na horizontal/vertical.'}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-sm font-semibold text-gray-300">Palavras-alvo</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {puzzle.targets.map((word) => (
              <span key={word} className={`rounded-full border px-3 py-1 text-sm font-bold ${foundSet.has(word) ? 'border-polyglot-green/50 bg-polyglot-green/20 text-polyglot-green line-through' : 'border-white/10 bg-white/5 text-gray-300'}`}>{word}</span>
            ))}
          </div>
          {isComplete && <p className="mt-4 rounded-lg bg-polyglot-green/15 p-3 text-sm font-semibold text-polyglot-green">Blocos concluídos — treino local sem alterar progresso.</p>}
        </div>
      </div>
    </div>
  )
}

function SkillTrail({ path, lessonContext, page, mobilePage, onPageChange, onMobilePageChange, currentSessionNumber, onSessionClick }) {
  const desktopWindowState = sessionWindowForPage(path.nodes, page, 5)
  const mobileWindowState = sessionWindowForPage(path.nodes, mobilePage, 3)
  const layout = trailHeaderLayoutClasses()

  function renderDesktopNode(node, index, nodes) {
    const isActiveSession = node.number === currentSessionNumber
    const isEnabled = isTrailSessionEnabled(node, path.completed_sessions, currentSessionNumber)
    const nextNode = nodes[index + 1]
    return (
      <div key={node.number} className="flex flex-1 items-center last:flex-none">
        <button type="button" disabled={!isEnabled} onClick={() => onSessionClick?.(node.number)} className="flex flex-col items-center gap-2 disabled:cursor-not-allowed" title={isEnabled ? `Abrir sessão ${node.number}` : 'Sessão bloqueada'}>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-bold transition ${trailNodeStateClasses(node, isActiveSession)}`}>
            {node.status === 'completed' ? '✓' : <Star size={18} />}
          </div>
          <span className={`${layout.nodeLabel} ${isActiveSession ? 'text-polyglot-accent' : 'text-gray-400'}`}>Sessão {node.number}</span>
        </button>
        {index < nodes.length - 1 && <div className={`mx-2 h-1 flex-1 rounded-full ${trailConnectorStateClasses(node, nextNode, currentSessionNumber)}`} />}
      </div>
    )
  }

  function renderMobileNode(node, index, nodes) {
    const isActiveSession = node.number === currentSessionNumber
    const isEnabled = isTrailSessionEnabled(node, path.completed_sessions, currentSessionNumber)
    const nextNode = nodes[index + 1]
    return (
      <React.Fragment key={node.number}>
        <div role={isEnabled ? 'button' : undefined} tabIndex={isEnabled ? 0 : undefined} onClick={isEnabled ? () => onSessionClick?.(node.number) : undefined} onKeyDown={isEnabled ? (event) => { if (event.key === 'Enter' || event.key === ' ') onSessionClick?.(node.number) } : undefined} className="min-w-0 flex-1 text-center" title={isEnabled ? `Abrir sessão ${node.number}` : 'Sessão bloqueada'}>
          <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition ${trailNodeStateClasses(node, isActiveSession)}`}>
            {node.status === 'completed' ? '✓' : <Star size={16} />}
          </div>
          <span className={`mt-1 block truncate text-[11px] font-semibold ${isActiveSession ? 'text-polyglot-accent' : 'text-gray-400'}`}>S{node.number}</span>
        </div>
        {index < nodes.length - 1 && <div className={`${layout.mobileConnector} ${trailConnectorStateClasses(node, nextNode, currentSessionNumber)}`} />}
      </React.Fragment>
    )
  }

  return (
    <div className="card">
      <div className={layout.wrapper}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold">Trilha de níveis — {path.language_name}</h3>
            <p className="mt-1 text-sm text-gray-400">Escolha uma sessão liberada ou avance pela trilha.</p>
          </div>
          <span className="w-fit rounded-full bg-polyglot-accent/20 px-3 py-1 text-sm text-polyglot-accent">{path.completed_sessions}/{path.total_sessions}</span>
        </div>
        {lessonContext && (
          <div className={layout.contextCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-polyglot-accent">{lessonContext.label}</p>
            <h4 className="mt-1 text-lg font-bold text-white">{lessonContext.title}</h4>
            {lessonContext.description && <p className="mt-1 text-sm text-gray-300">{lessonContext.description}</p>}
          </div>
        )}
        <div className={layout.mobileTrail}>
          <button type="button" className="btn-secondary shrink-0 rounded-full p-3 disabled:opacity-30" disabled={!mobileWindowState.canGoPrev} onClick={() => onMobilePageChange(mobileWindowState.page - 1)} aria-label="Ver sessões anteriores">
            <ChevronLeft size={20} />
          </button>
          <div className={layout.mobileTrailNodes}>
            {mobileWindowState.visibleNodes.map(renderMobileNode)}
          </div>
          <button type="button" className="btn-secondary shrink-0 rounded-full p-3 disabled:opacity-30" disabled={!mobileWindowState.canGoNext} onClick={() => onMobilePageChange(mobileWindowState.page + 1)} aria-label="Ver próximas sessões">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className={layout.desktopTrail}>
          {desktopWindowState.canGoPrev && (
            <button type="button" className="btn-secondary shrink-0 rounded-full p-3" onClick={() => onPageChange(desktopWindowState.page - 1)} aria-label="Ver sessões anteriores">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className={layout.desktopTrailNodes}>
            {desktopWindowState.visibleNodes.map(renderDesktopNode)}
          </div>
          {desktopWindowState.canGoNext && (
            <button type="button" className="btn-secondary shrink-0 rounded-full p-3" onClick={() => onPageChange(desktopWindowState.page + 1)} aria-label="Ver próximas sessões">
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Choice({ options, selected, setSelected, onInteract }) {
  const shortcutLabels = choiceShortcutLabels(options)
  return <div className="grid gap-3 sm:grid-cols-2">{options.map((option, index) => <button key={option} onClick={() => { onInteract(); setSelected(option) }} className={`flex items-center gap-3 rounded-xl border p-4 text-left text-lg font-semibold transition ${selected === option ? 'border-polyglot-accent bg-polyglot-accent/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>{shortcutLabels[index] && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 text-sm font-bold text-polyglot-accent">{shortcutLabels[index]}</span>}<span>{option}</span></button>)}</div>
}

function ImageChoice({ options, selected, setSelected, onInteract }) {
  const selectable = selectableImageChoiceOptions(options)
  const shortcutLabels = choiceShortcutLabels(selectable)
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {selectable.map((option, index) => (
        <button key={option.key} onClick={() => { onInteract(); setSelected(option.selectValue) }} className={`relative rounded-2xl border p-4 text-center transition ${selected === option.selectValue ? 'border-polyglot-accent bg-polyglot-accent/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
          {shortcutLabels[index] && <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/60 text-sm font-bold text-polyglot-accent">{shortcutLabels[index]}</span>}
          <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-white/90 p-2">
            <img src={option.imageSrc} alt={option.label} className="h-full w-full object-contain" />
          </div>
          <div className="mt-1 text-lg font-bold text-white">{option.displayText}</div>
        </button>
      ))}
    </div>
  )
}

function ListenBuildDictation({ typedAnswer, setTypedAnswer, onInteract, onSubmit, canSubmit, busy }) {
  function updateTypedAnswer(event) {
    onInteract()
    setTypedAnswer(event.target.value)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && canSubmit && !busy) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-polyglot-accent/30 bg-polyglot-accent/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-semibold text-polyglot-accent">
          Ditado curto: digite o que ouviu
          <input
            type="text"
            value={typedAnswer}
            onChange={updateTypedAnswer}
            onKeyDown={handleKeyDown}
            placeholder="Digite a frase no idioma-alvo..."
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none transition placeholder:text-gray-500 focus:border-polyglot-accent"
          />
        </label>
        {typedAnswer && (
          <button type="button" className="btn-secondary" onClick={() => { onInteract(); setTypedAnswer('') }}>
            Prefiro montar com peças
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-400">Pressione Enter para verificar quando a frase digitada tiver a mesma quantidade de palavras da resposta. Se preferir, deixe o campo vazio e use as peças abaixo.</p>
    </div>
  )
}

function SequenceDialogue({ item, built, setBuilt, onInteract }) {
  const tiles = buildTilesForItem(item)

  function removePhrase(index) {
    onInteract()
    setBuilt(built.filter((_, idx) => idx !== index))
  }

  function dragPhrase(event, index) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-polyglot-dialogue-phrase-index', String(index))
  }

  function dropPhrase(event, toIndex) {
    event.preventDefault()
    const rawIndex = event.dataTransfer.getData('application/x-polyglot-dialogue-phrase-index')
    if (rawIndex === '') return
    onInteract()
    setBuilt(reorderBuiltWords(built, Number(rawIndex), toIndex))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-polyglot-accent/30 bg-polyglot-accent/10 p-4">
        <p className="text-sm font-semibold text-polyglot-accent">Sequência montada</p>
        <div className="mt-3 min-h-20 rounded-xl border border-dashed border-white/20 bg-black/20 p-3">
          {built.length === 0 ? (
            <span className="text-gray-500">Toque nas cartas para ordenar o diálogo...</span>
          ) : (
            <ol className="space-y-2">
              {built.map((phrase, i) => (
                <li key={`${phrase}-${i}`} className="flex items-start gap-2">
                  <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/30 text-sm font-bold text-polyglot-accent">{i + 1}</span>
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => dragPhrase(event, i)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => dropPhrase(event, i)}
                    onClick={() => removePhrase(i)}
                    aria-label={`Arraste a fala ${phrase} para mudar a ordem ou clique para remover`}
                    className="w-full cursor-grab rounded-xl border border-polyglot-accent/40 bg-polyglot-accent/20 px-4 py-3 text-left font-semibold text-white transition hover:scale-[1.01] active:cursor-grabbing active:scale-[0.99]"
                    title="Arraste para reordenar · Clique para remover"
                  >
                    {phrase}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
        {built.length > 1 && <p className="mt-2 text-xs text-gray-400">Você pode arrastar as cartas selecionadas para ajustar a ordem antes de verificar.</p>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {tiles.map((tile, i) => (
          <button key={`${tile}-${i}`} disabled={built.includes(tile)} onClick={() => { onInteract(); setBuilt([...built, tile]) }} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left font-semibold hover:bg-white/20 disabled:opacity-30">
            {tile}
          </button>
        ))}
      </div>
    </div>
  )
}

function Build({ item, built, setBuilt, onInteract }) {
  if (isLetterScrambleEligible(item)) {
    return <LetterScramble item={item} built={built} onInteract={onInteract} setBuilt={setBuilt} />
  }

  const tiles = buildTilesForItem(item)

  function removeWord(index) {
    onInteract()
    setBuilt(built.filter((_, idx) => idx !== index))
  }

  function dragWord(event, index) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-polyglot-built-word-index', String(index))
  }

  function dropWord(event, toIndex) {
    event.preventDefault()
    const rawIndex = event.dataTransfer.getData('application/x-polyglot-built-word-index')
    if (rawIndex === '') return
    const fromIndex = Number(rawIndex)
    onInteract()
    setBuilt(reorderBuiltWords(built, fromIndex, toIndex))
  }

  return (
    <div className="space-y-4">
      <div className="min-h-16 rounded-xl border border-dashed border-white/20 bg-white/5 p-4">
        {built.length === 0 ? (
          <span className="text-gray-500">Toque nas palavras para montar a frase...</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {built.map((word, i) => (
              <button
                key={`${word}-${i}`}
                type="button"
                draggable
                onDragStart={(event) => dragWord(event, i)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => dropWord(event, i)}
                onClick={() => removeWord(i)}
                aria-label={`Arraste ${word} para mudar a ordem ou clique para remover`}
                className="cursor-grab rounded-lg bg-polyglot-accent px-3 py-2 font-semibold text-white shadow-sm transition hover:scale-[1.02] active:cursor-grabbing active:scale-95"
                title="Arraste para reordenar · Clique para remover"
              >
                {word}
              </button>
            ))}
          </div>
        )}
      </div>
      {built.length > 1 && <p className="text-xs text-gray-500">Errou a ordem? Clique e arraste uma palavra selecionada para reorganizar a frase. Clique simples remove a palavra.</p>}
      <div className="flex flex-wrap gap-2">
        {tiles.map((tile, i) => (
          <button key={`${tile}-${i}`} disabled={built.includes(tile)} onClick={() => { onInteract(); setBuilt([...built, tile]) }} className="rounded-lg bg-white/10 px-4 py-3 font-semibold hover:bg-white/20 disabled:opacity-30">{tile}</button>
        ))}
      </div>
    </div>
  )
}

function LetterScramble({ item, built, setBuilt, onInteract }) {
  const answer = singleWordBuildAnswer(item)
  const letters = stableScrambleLetters(answer, item.id ?? item.prompt)

  function selectedLetterCount(letter) {
    return built.filter((selected) => selected === letter).length
  }

  function availableLetterCount(letter, index) {
    return letters.slice(0, index + 1).filter((available) => available === letter).length
  }

  function removeLetter(index) {
    onInteract()
    setBuilt(built.filter((_, idx) => idx !== index))
  }

  return (
    <div className="space-y-4">
      <div className="min-h-16 rounded-xl border border-dashed border-polyglot-accent/40 bg-polyglot-accent/10 p-4">
        {built.length === 0 ? (
          <span className="text-gray-500">Toque nas letras para montar a palavra...</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {built.map((letter, i) => (
              <button
                key={`${letter}-${i}`}
                type="button"
                onClick={() => removeLetter(i)}
                aria-label={`Remover letra ${letter}`}
                className="rounded-lg bg-polyglot-accent px-3 py-2 text-xl font-bold text-white shadow-sm transition hover:scale-[1.02] active:scale-95"
                title="Clique para remover"
              >
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500">Variante de embaralhar letras: reconstrua a palavra e envie como resposta curta.</p>
      <div className="flex flex-wrap gap-2">
        {letters.map((letter, i) => (
          <button
            key={`${letter}-${i}`}
            type="button"
            disabled={selectedLetterCount(letter) >= availableLetterCount(letter, i)}
            onClick={() => { onInteract(); setBuilt([...built, letter]) }}
            className="rounded-lg bg-white/10 px-4 py-3 text-xl font-bold hover:bg-white/20 disabled:opacity-30"
          >
            {letter}
          </button>
        ))}
      </div>
      {built.length > 0 && (
        <button type="button" className="text-sm font-semibold text-polyglot-accent hover:underline" onClick={() => { onInteract(); setBuilt([]) }}>
          Limpar letras
        </button>
      )}
    </div>
  )
}

function Match({ item, matched, setMatched, onInteract }) {
  const pairs = matchPairs(item)
  const cards = useMemo(() => buildMemoryMatchCards(pairs, item.id ?? item.prompt), [item.id, item.prompt, pairs])
  const [selectedCards, setSelectedCards] = useState([])
  const [mismatchedIds, setMismatchedIds] = useState([])

  useEffect(() => {
    setSelectedCards([])
    setMismatchedIds([])
  }, [item.id])

  function isCardFound(card) {
    if (card.side === 'left') return matched[card.value] === card.matchValue
    return matched[card.matchValue] === card.value
  }

  function chooseCard(card) {
    if (isCardFound(card) || selectedCards.some((selected) => selected.id === card.id)) return
    onInteract()
    const nextSelected = selectedCards.length >= 2 ? [card] : [...selectedCards, card]
    setSelectedCards(nextSelected)

    if (nextSelected.length === 2) {
      const result = memoryMatchSelection({ selectedCards: nextSelected, matched })
      if (result.isPairFound) setMatched(result.matched)
      if (!result.isPairFound) setMismatchedIds(nextSelected.map((selected) => selected.id))
      window.setTimeout(() => {
        setSelectedCards([])
        setMismatchedIds([])
      }, result.isPairFound ? 250 : 700)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">Vire duas cartas para encontrar cada par. Pares corretos ficam revelados e a resposta final continua no mesmo formato de associação.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => {
          const found = isCardFound(card)
          const selected = selectedCards.some((candidate) => candidate.id === card.id)
          const mismatched = mismatchedIds.includes(card.id)
          const revealed = found || selected
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => chooseCard(card)}
              aria-pressed={revealed}
              disabled={found}
              className={`min-h-24 rounded-2xl border p-3 text-center font-bold transition ${found ? 'border-polyglot-green/60 bg-polyglot-green/20 text-polyglot-green' : mismatched ? 'border-red-400/70 bg-red-500/20 text-red-100' : selected ? 'border-polyglot-accent bg-polyglot-accent/20 text-white' : 'border-white/10 bg-white/5 text-gray-500 hover:border-polyglot-accent/50 hover:bg-white/10'}`}
            >
              {revealed ? (
                <span className="block text-lg text-white">{card.value}</span>
              ) : (
                <span className="block text-2xl text-polyglot-accent">?</span>
              )}
              {revealed && <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">{card.side === 'left' ? 'termo' : 'par'}</span>}
            </button>
          )
        })}
      </div>
      <div className="text-xs text-gray-500">Pares encontrados: {Object.keys(matched).length}/{pairs.length}</div>
    </div>
  )
}
