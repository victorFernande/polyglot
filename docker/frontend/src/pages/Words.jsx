import React, { useEffect, useState } from 'react'
import { Loader2, BookOpen } from 'lucide-react'
import LanguageFlag from '../components/LanguageFlag'
import { loadLearnedWords } from '../lib/api'

export default function Words() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    loadLearnedWords()
      .then((payload) => {
        if (mounted) setData(payload)
      })
      .catch((err) => {
        if (mounted) setError(err.message)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-polyglot-accent" size={42} /></div>
  }

  if (error) {
    return <div className="card border-red-500/30 bg-red-500/10 text-red-200">Erro: {error}</div>
  }

  const languages = data?.languages || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="text-polyglot-blue" size={30} />
        <div>
          <h1 className="text-3xl font-bold">Palavras aprendidas</h1>
          <p className="text-gray-400">{data?.total || 0} palavras/frases corretas, separadas por língua.</p>
        </div>
      </div>

      {languages.length === 0 ? (
        <div className="card text-gray-300">Nenhuma palavra aprendida ainda. Complete exercícios para preencher esta lista.</div>
      ) : languages.map((language) => (
        <section key={language.language_code} className="card overflow-hidden">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <LanguageFlag code={language.language_code} className="h-9 w-9 rounded-full" />
              <h2 className="text-xl font-bold">{language.language_name}</h2>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-gray-300">{language.count} itens</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-2 bg-white/10 px-4 py-3 text-sm font-bold uppercase tracking-wide text-gray-300">
              <div>Palavra</div>
              <div>Tradução</div>
            </div>
            <div className="divide-y divide-white/10">
              {language.words.map((word) => (
                <div key={`${word.language_code}-${word.word}`} className="grid grid-cols-2 gap-4 px-4 py-3 text-sm">
                  <div className="font-semibold text-white">{word.word}</div>
                  <div className="text-gray-300">{word.translation_pt}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
