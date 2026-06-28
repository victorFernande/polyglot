import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Heart, X, Volume2, RotateCcw, Trophy, ArrowRight } from 'lucide-react'
import LanguageFlag from '../components/LanguageFlag'

const LANGUAGES = [
  { code: 'de', name: 'Alemão', accent: 'Rammstein', color: 'from-red-600 to-red-900' },
  { code: 'fr', name: 'Francês', accent: 'Chanson', color: 'from-blue-600 to-blue-900' },
  { code: 'ru', name: 'Russo', accent: 'Música Russa', color: 'from-yellow-600 to-yellow-900' },
  { code: 'jp', name: 'Japonês', accent: 'Anime/Manga', color: 'from-pink-600 to-pink-900' },
]

const EXERCISES = {
  de: [
    { type: 'choice', prompt: 'Como se diz “o sol” em alemão?', answer: 'die Sonne', options: ['die Sonne', 'der Stern', 'das Licht', 'die Nacht'], hint: 'Rammstein: “Hier kommt die Sonne”.' },
    { type: 'build', prompt: 'Monte: “Eu quero”', answer: ['Ich', 'will'], tiles: ['will', 'Ich', 'du', 'hast'], hint: 'Ich Will é uma música perfeita para verbos modais.' },
    { type: 'match', prompt: 'Combine as palavras', pairs: [['Feuer', 'fogo'], ['Wasser', 'água'], ['Herz', 'coração']], hint: 'Vocabulário recorrente em rock/poesia alemã.' },
  ],
  fr: [
    { type: 'choice', prompt: 'Como se diz “a vida” em francês?', answer: 'la vie', options: ['la vie', 'le jour', 'la nuit', 'le cœur'], hint: 'Édith Piaf: “La Vie en Rose”.' },
    { type: 'build', prompt: 'Monte: “Eu quero”', answer: ['Je', 'veux'], tiles: ['veux', 'Je', 'tu', 'suis'], hint: 'Zaz: “Je veux”.' },
    { type: 'match', prompt: 'Combine as palavras', pairs: [['bonjour', 'olá'], ['merci', 'obrigado'], ['eau', 'água']], hint: 'Palavras de sobrevivência em francês.' },
  ],
  ru: [
    { type: 'choice', prompt: 'Qual letra cirílica parece “P”, mas soa como R?', answer: 'Р', options: ['Р', 'В', 'Н', 'С'], hint: 'Р é vibrante, como em “Россия”.' },
    { type: 'build', prompt: 'Monte: “Eu amo”', answer: ['Я', 'люблю'], tiles: ['люблю', 'Я', 'ты', 'дом'], hint: 'Я люблю = eu amo.' },
    { type: 'match', prompt: 'Combine as palavras', pairs: [['дом', 'casa'], ['вода', 'água'], ['огонь', 'fogo']], hint: 'Leia primeiro em cirílico, depois traduza.' },
  ],
  jp: [
    { type: 'choice', prompt: 'Qual hiragana representa o som “a”?', answer: 'あ', options: ['あ', 'い', 'う', 'え'], hint: 'あ é o primeiro hiragana.' },
    { type: 'build', prompt: 'Monte: “Eu estudo japonês”', answer: ['日本語', 'を', '勉強します'], tiles: ['勉強します', 'を', '日本語', '私'], hint: 'Objeto + を + verbo.' },
    { type: 'match', prompt: 'Combine as palavras', pairs: [['火', 'fogo'], ['水', 'água'], ['人', 'pessoa']], hint: 'Kanji básicos aparecem muito em anime/manga.' },
  ],
}

export default function Exercises() {
  const [language, setLanguage] = useState('de')
  const [index, setIndex] = useState(0)
  const [hearts, setHearts] = useState(5)
  const [correct, setCorrect] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [selected, setSelected] = useState(null)
  const [built, setBuilt] = useState([])
  const [matched, setMatched] = useState({})

  const lesson = EXERCISES[language]
  const exercise = lesson[index]
  const progress = ((index) / lesson.length) * 100
  const currentLang = LANGUAGES.find((l) => l.code === language)

  const resetExerciseState = () => {
    setFeedback(null)
    setSelected(null)
    setBuilt([])
    setMatched({})
  }

  const chooseLanguage = (code) => {
    setLanguage(code)
    setIndex(0)
    setHearts(5)
    setCorrect(0)
    resetExerciseState()
  }

  const isCorrect = useMemo(() => {
    if (exercise.type === 'choice') return selected === exercise.answer
    if (exercise.type === 'build') return built.join(' ') === exercise.answer.join(' ')
    if (exercise.type === 'match') return exercise.pairs.every(([a, b]) => matched[a] === b)
    return false
  }, [exercise, selected, built, matched])

  const check = () => {
    if (isCorrect) {
      setFeedback('correct')
      setCorrect((v) => v + 1)
    } else {
      setFeedback('wrong')
      setHearts((h) => Math.max(0, h - 1))
    }
  }

  const next = () => {
    if (index + 1 >= lesson.length) {
      setFeedback('done')
      return
    }
    setIndex((i) => i + 1)
    resetExerciseState()
  }

  const restart = () => {
    setIndex(0)
    setHearts(5)
    setCorrect(0)
    resetExerciseState()
  }

  const canCheck = exercise.type === 'choice'
    ? !!selected
    : exercise.type === 'build'
      ? built.length === exercise.answer.length
      : Object.keys(matched).length === exercise.pairs.length

  if (feedback === 'done') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="card text-center py-12">
          <Trophy className="mx-auto mb-4 text-polyglot-gold" size={72} />
          <h1 className="text-3xl font-bold mb-2">Lição concluída!</h1>
          <p className="text-gray-400 mb-6">Você acertou {correct} de {lesson.length}. Os pontos ainda começam zerados; XP real entra quando conectarmos persistência completa.</p>
          <button className="btn-primary inline-flex items-center gap-2" onClick={restart}>
            <RotateCcw size={18} /> Refazer lição
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🎮 Exercícios rápidos</h1>
        <p className="text-gray-400">Lições curtas com progresso, vidas e feedback imediato — inspirado em boas práticas de apps como Duolingo.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LANGUAGES.map((lang) => (
          <button key={lang.code} onClick={() => chooseLanguage(lang.code)} className={`card p-4 text-left transition-all ${language === lang.code ? 'ring-2 ring-polyglot-accent' : 'hover:bg-white/5'}`}>
            <div className="flex items-center gap-3">
              <LanguageFlag code={lang.code} className="h-10 w-10" />
              <div>
                <div className="font-bold">{lang.name}</div>
                <div className="text-xs text-gray-400">{lang.accent}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1 progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-1 text-red-400">
            {Array.from({ length: 5 }).map((_, i) => <Heart key={i} size={20} className={i < hearts ? 'fill-current' : 'opacity-25'} />)}
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <LanguageFlag code={language} className="h-12 w-12" />
          <div>
            <p className="text-sm text-gray-400">{currentLang.name} · questão {index + 1}/{lesson.length}</p>
            <h2 className="text-2xl font-bold">{exercise.prompt}</h2>
          </div>
          <button className="ml-auto btn-secondary" title="Ouvir exemplo"><Volume2 size={18} /></button>
        </div>

        {exercise.type === 'choice' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {exercise.options.map((option) => (
              <button key={option} onClick={() => setSelected(option)} className={`rounded-xl border p-4 text-left text-lg font-semibold transition ${selected === option ? 'border-polyglot-accent bg-polyglot-accent/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                {option}
              </button>
            ))}
          </div>
        )}

        {exercise.type === 'build' && (
          <div className="space-y-4">
            <div className="min-h-16 rounded-xl border border-dashed border-white/20 bg-white/5 p-4">
              {built.length === 0 ? <span className="text-gray-500">Toque nas palavras para montar a frase...</span> : built.map((word, i) => (
                <button key={`${word}-${i}`} onClick={() => setBuilt(built.filter((_, idx) => idx !== i))} className="mr-2 mb-2 rounded-lg bg-polyglot-accent px-3 py-2 font-semibold">{word}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {exercise.tiles.map((tile, i) => (
                <button key={`${tile}-${i}`} disabled={built.includes(tile)} onClick={() => setBuilt([...built, tile])} className="rounded-lg bg-white/10 px-4 py-3 font-semibold hover:bg-white/20 disabled:opacity-30">{tile}</button>
              ))}
            </div>
          </div>
        )}

        {exercise.type === 'match' && (
          <div className="grid gap-3 md:grid-cols-2">
            {exercise.pairs.map(([left]) => (
              <div key={left} className="rounded-xl bg-white/5 p-4">
                <div className="mb-3 text-xl font-bold">{left}</div>
                <div className="flex flex-wrap gap-2">
                  {exercise.pairs.map(([, right]) => (
                    <button key={right} onClick={() => setMatched({ ...matched, [left]: right })} className={`rounded-lg px-3 py-2 text-sm font-semibold ${matched[left] === right ? 'bg-polyglot-accent' : 'bg-white/10 hover:bg-white/20'}`}>{right}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-gray-300">
          <strong>Dica:</strong> {exercise.hint}
        </div>

        {feedback && feedback !== 'done' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 rounded-xl p-4 ${feedback === 'correct' ? 'bg-polyglot-green/20 text-polyglot-green' : 'bg-red-500/20 text-red-300'}`}>
            <div className="flex items-center gap-2 font-bold">
              {feedback === 'correct' ? <Check size={20} /> : <X size={20} />}
              {feedback === 'correct' ? 'Correto!' : 'Quase! Revise a dica e tente novamente.'}
            </div>
          </motion.div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          {feedback === 'wrong' && <button className="btn-secondary" onClick={resetExerciseState}>Tentar novamente</button>}
          {!feedback && <button className="btn-primary disabled:opacity-40" disabled={!canCheck} onClick={check}>Verificar</button>}
          {feedback === 'correct' && <button className="btn-primary inline-flex items-center gap-2" onClick={next}>Continuar <ArrowRight size={18} /></button>}
        </div>
      </div>
    </div>
  )
}
