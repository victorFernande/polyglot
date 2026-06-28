import React from 'react'
import { motion } from 'framer-motion'
import { Lock, Trophy } from 'lucide-react'
import { useStore } from '../stores/useStore'

export default function Achievements() {
  const { achievements } = useStore()

  const allAchievements = [
    { id: 1, code: 'first_step', name: 'Primeiro Passo', description: 'Complete sua primeira tarefa', icon: '👣', xp_reward: 10, earned: false },
    { id: 2, code: 'streak_3', name: 'Fogo Baixo', description: '3 dias de streak', icon: '🔥', xp_reward: 30, earned: false },
    { id: 3, code: 'streak_7', name: 'Fogo Médio', description: '7 dias de streak', icon: '🔥', xp_reward: 70, earned: false },
    { id: 4, code: 'streak_14', name: 'Fogo Alto', description: '14 dias de streak', icon: '🔥', xp_reward: 150, earned: false },
    { id: 5, code: 'streak_30', name: 'Fogo Infernal', description: '30 dias de streak', icon: '🔥', xp_reward: 500, earned: false },
    { id: 6, code: 'vocab_50', name: 'Colecionador', description: 'Aprenda 50 palavras', icon: '📚', xp_reward: 50, earned: false },
    { id: 7, code: 'vocab_100', name: 'Linguista', description: 'Aprenda 100 palavras', icon: '🎓', xp_reward: 100, earned: false },
    { id: 8, code: 'phase_1', name: 'Despertar', description: 'Complete a FASE 1', icon: '🌅', xp_reward: 50, earned: false },
    { id: 9, code: 'phase_2', name: 'Primeiras Palavras', description: 'Complete a FASE 2', icon: '💬', xp_reward: 100, earned: false },
    { id: 10, code: 'phase_3', name: 'Estruturas', description: 'Complete a FASE 3', icon: '🏗️', xp_reward: 150, earned: false },
    { id: 11, code: 'boss_defeated', name: 'Caçador de Bosses', description: 'Derrote seu primeiro Boss', icon: '⚔️', xp_reward: 300, earned: false },
    { id: 12, code: 'wave_1', name: 'Ondas Iniciante', description: 'Complete a Onda 1', icon: '🌊', xp_reward: 500, earned: false },
    { id: 13, code: 'polyglot', name: 'Poliglota', description: 'Complete todas as 4 ondas', icon: '🌍', xp_reward: 5000, earned: false },
  ]

  const earnedCount = allAchievements.filter(a => a.earned).length
  const totalXP = allAchievements.filter(a => a.earned).reduce((sum, a) => sum + a.xp_reward, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🏆 Conquistas</h1>
        <p className="text-gray-400">
          {earnedCount} de {allAchievements.length} conquistas desbloqueadas
        </p>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-3xl mb-2">{earnedCount}</div>
          <div className="stat-label">Conquistas</div>
        </div>
        <div className="stat-card">
          <div className="text-3xl mb-2 text-polyglot-gold">{totalXP}</div>
          <div className="stat-label">XP de Conquistas</div>
        </div>
        <div className="stat-card">
          <div className="text-3xl mb-2">{Math.round((earnedCount / allAchievements.length) * 100)}%</div>
          <div className="stat-label">Completado</div>
        </div>
        <div className="stat-card">
          <div className="text-3xl mb-2">{allAchievements.length - earnedCount}</div>
          <div className="stat-label">Restantes</div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allAchievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`card relative overflow-hidden ${
              achievement.earned ? '' : 'achievement-locked'
            }`}
          >
            {achievement.earned && (
              <div className="absolute top-2 right-2">
                <Trophy size={16} className="text-polyglot-gold" />
              </div>
            )}
            
            <div className="flex items-start gap-4">
              <div className={`text-4xl ${achievement.earned ? '' : 'grayscale'}`}>
                {achievement.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{achievement.name}</h3>
                <p className="text-sm text-gray-400 mb-2">{achievement.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm xp-text">+{achievement.xp_reward} XP</span>
                  {achievement.earned ? (
                    <span className="text-xs text-polyglot-green">✓ Desbloqueada</span>
                  ) : (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Lock size={12} /> Bloqueada
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
