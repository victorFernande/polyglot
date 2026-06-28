import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, CheckCircle, Play, Star } from 'lucide-react'
import LanguageFlag from '../components/LanguageFlag'
import { getWaves } from '../lib/api'

const flagByLanguage = {
  german: 'de',
  french: 'fr',
  russian: 'ru',
  japanese: 'jp',
}

const waveGradients = ['from-red-600 to-red-900', 'from-blue-600 to-blue-900', 'from-yellow-600 to-yellow-900', 'from-pink-600 to-pink-900']
const phaseIcons = ['🌅', '💬', '🏗️', '⚔️']

export default function Waves() {
  const [waves, setWaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadWaves()
  }, [])

  async function loadWaves() {
    setLoading(true)
    setError(null)
    try {
      setWaves(await getWaves())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-polyglot-accent" /></div>
  }

  if (error) {
    return <div className="card border border-red-500/30 text-red-300">Erro ao carregar ondas: {error}</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">🌊 Ondas de Aprendizado</h1>
        <p className="text-gray-400">Ondas, fases e progresso vêm da API do usuário Victor.</p>
      </div>

      <div className="grid gap-6">
        {waves.map((wave, index) => (
          <motion.div
            key={wave.id}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
          >
            <div className={`card relative overflow-hidden ${wave.status === 'locked' ? 'wave-locked' : wave.status === 'active' ? 'wave-active' : 'wave-completed'}`}>
              <div className={`absolute inset-0 bg-gradient-to-r ${waveGradients[index] || 'from-polyglot-accent to-polyglot-purple'} opacity-10`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <LanguageFlag code={flagByLanguage[wave.language] || 'de'} className="h-14 w-14" />
                    <div>
                      <h2 className="text-2xl font-bold">Onda {wave.wave_number}: {wave.language_name}</h2>
                      <p className="text-gray-400">🎸 Âncora: {wave.anchor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {wave.status === 'locked' && <Lock size={24} className="text-gray-500" />}
                    {wave.status === 'active' && <Play size={24} className="text-polyglot-accent" />}
                    {wave.status === 'completed' && <CheckCircle size={24} className="text-polyglot-green" />}
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${wave.status === 'locked' ? 'bg-gray-700 text-gray-400' : wave.status === 'active' ? 'bg-polyglot-accent/20 text-polyglot-accent' : 'bg-polyglot-green/20 text-polyglot-green'}`}>
                      {wave.status === 'locked' ? 'Bloqueada' : wave.status === 'active' ? 'Liberada' : 'Completada'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {(wave.phases || []).map((phase, phaseIndex) => (
                    <div
                      key={phase.id}
                      className={`p-4 rounded-xl border transition-all duration-300 ${phase.status === 'locked' ? 'bg-white/5 border-white/5 opacity-50' : phase.status === 'active' ? 'bg-polyglot-accent/10 border-polyglot-accent/30 hover:bg-polyglot-accent/20 cursor-pointer' : 'bg-polyglot-green/10 border-polyglot-green/30'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{phaseIcons[phaseIndex] || '⭐'}</span>
                        <span className="text-xs text-gray-500">Fase {phase.phase_number}</span>
                      </div>
                      <h3 className="font-semibold mb-1">{phase.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-400"><Star size={14} /><span>{phase.total_tasks} tarefas</span></div>
                      <div className="mt-3">
                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${phase.progress_percent || 0}%` }} /></div>
                        <p className="text-xs text-gray-400 mt-1">{phase.tasks_completed}/{phase.total_tasks} completas</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm text-gray-300">
                  <div className="p-3 bg-white/5 rounded-xl">✨ {wave.total_xp} XP na onda</div>
                  <div className="p-3 bg-white/5 rounded-xl">📚 {wave.vocabulary_count} palavras</div>
                  <div className="p-3 bg-white/5 rounded-xl">⏱️ {wave.hours_input.toFixed(1)}h de input</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="card flex flex-wrap gap-6 text-sm">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-polyglot-accent/20 border border-polyglot-accent" /><span>Onda liberada</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gray-700 border border-gray-600" /><span>Bloqueada</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-polyglot-green/20 border border-polyglot-green" /><span>Completada</span></div>
      </div>
    </div>
  )
}
