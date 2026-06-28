import React from 'react'
import { motion } from 'framer-motion'
import { Lock, CheckCircle, Play, Star } from 'lucide-react'

const waves = [
  { id: 1, number: 1, flag: '🇩🇪', language: 'Alemão', anchor: 'Rammstein', status: 'active', color: 'from-red-600 to-red-900' },
  { id: 2, number: 2, flag: '🇫🇷', language: 'Francês', anchor: 'Música Francesa', status: 'locked', color: 'from-blue-600 to-blue-900' },
  { id: 3, number: 3, flag: '🇷🇺', language: 'Russo', anchor: 'Música Russa', status: 'locked', color: 'from-yellow-600 to-yellow-900' },
  { id: 4, number: 4, flag: '🇯🇵', language: 'Japonês', anchor: 'Anime/Manga', status: 'locked', color: 'from-pink-600 to-pink-900' },
]

const phases = [
  { number: 1, name: 'O Despertar', icon: '🌅', tasks: 7 },
  { number: 2, name: 'Primeiras Palavras', icon: '💬', tasks: 10 },
  { number: 3, name: 'Estruturas', icon: '🏗️', tasks: 8 },
  { number: 4, name: 'O Boss', icon: '⚔️', tasks: 5 },
]

export default function Waves() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">🌊 Ondas de Aprendizado</h1>
        <p className="text-gray-400">Complete cada onda para desbloquear a próxima. Derrote o Boss para avançar!</p>
      </div>

      {/* Waves Map */}
      <div className="grid gap-6">
        {waves.map((wave, index) => (
          <motion.div
            key={wave.id}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
          >
            <div className={`card relative overflow-hidden ${
              wave.status === 'locked' ? 'wave-locked' : 
              wave.status === 'active' ? 'wave-active' : 'wave-completed'
            }`}>
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-r ${wave.color} opacity-10`} />
              
              <div className="relative">
                {/* Wave Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">{wave.flag}</span>
                    <div>
                      <h2 className="text-2xl font-bold">Onda {wave.number}: {wave.language}</h2>
                      <p className="text-gray-400">🎸 Âncora: {wave.anchor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {wave.status === 'locked' && <Lock size={24} className="text-gray-500" />}
                    {wave.status === 'active' && <Play size={24} className="text-polyglot-accent" />}
                    {wave.status === 'completed' && <CheckCircle size={24} className="text-polyglot-green" />}
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      wave.status === 'locked' ? 'bg-gray-700 text-gray-400' :
                      wave.status === 'active' ? 'bg-polyglot-accent/20 text-polyglot-accent' :
                      'bg-polyglot-green/20 text-polyglot-green'
                    }`}>
                      {wave.status === 'locked' ? 'Bloqueada' : 
                       wave.status === 'active' ? 'Em Progresso' : 'Completada'}
                    </span>
                  </div>
                </div>

                {/* Phases */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {phases.map((phase) => (
                    <div
                      key={phase.number}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        wave.status === 'locked' 
                          ? 'bg-white/5 border-white/5 opacity-50' :
                        wave.status === 'active' && phase.number === 1
                          ? 'bg-polyglot-accent/10 border-polyglot-accent/30 hover:bg-polyglot-accent/20 cursor-pointer'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{phase.icon}</span>
                        <span className="text-xs text-gray-500">Fase {phase.number}</span>
                      </div>
                      <h3 className="font-semibold mb-1">{phase.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Star size={14} />
                        <span>{phase.tasks} tarefas</span>
                      </div>
                      {wave.status === 'active' && phase.number === 1 && (
                        <div className="mt-3">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: '43%' }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">3/7 completas</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Boss Preview */}
                {wave.status !== 'locked' && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/20 to-red-900/20 rounded-xl border border-purple-500/20">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">👹</span>
                      <div>
                        <p className="font-semibold text-purple-300">Boss Final</p>
                        <p className="text-sm text-gray-400">
                          {wave.number === 1 ? 'Desafio: Entender "Du Hast" sem legenda + apresentação de 1 minuto' :
                           wave.number === 2 ? 'Desafio: Entender uma cena de Amélie sem legenda' :
                           wave.number === 3 ? 'Desafio: Ler um tweet em cirílico' :
                           'Desafio: Entender um anime sem legenda'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="card flex flex-wrap gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-polyglot-accent/20 border border-polyglot-accent" />
          <span>Onda Ativa</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-700 border border-gray-600" />
          <span>Bloqueada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-polyglot-green/20 border border-polyglot-green" />
          <span>Completada</span>
        </div>
      </div>
    </div>
  )
}
