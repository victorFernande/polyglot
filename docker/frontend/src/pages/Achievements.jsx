import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Trophy } from 'lucide-react'
import { getAchievements } from '../lib/api'

export default function Achievements() {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAchievements()
  }, [])

  async function loadAchievements() {
    setLoading(true)
    setError(null)
    try {
      setAchievements(await getAchievements())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const earnedCount = achievements.filter(a => a.earned).length
  const totalXP = achievements.filter(a => a.earned).reduce((sum, a) => sum + a.xp_reward, 0)
  const completion = achievements.length ? Math.round((earnedCount / achievements.length) * 100) : 0

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-polyglot-accent" /></div>
  }

  if (error) {
    return <div className="card border border-red-500/30 text-red-300">Erro ao carregar conquistas: {error}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🏆 Conquistas</h1>
        <p className="text-gray-400">
          {earnedCount} de {achievements.length} conquistas desbloqueadas
        </p>
      </div>

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
          <div className="text-3xl mb-2">{completion}%</div>
          <div className="stat-label">Completado</div>
        </div>
        <div className="stat-card">
          <div className="text-3xl mb-2">{achievements.length - earnedCount}</div>
          <div className="stat-label">Restantes</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`card relative overflow-hidden ${achievement.earned ? '' : 'achievement-locked'}`}
          >
            {achievement.earned && (
              <div className="absolute top-2 right-2">
                <Trophy size={16} className="text-polyglot-gold" />
              </div>
            )}
            <div className="flex items-start gap-4">
              <div className={`text-4xl ${achievement.earned ? '' : 'grayscale'}`}>{achievement.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{achievement.name}</h3>
                <p className="text-sm text-gray-400 mb-2">{achievement.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm xp-text">+{achievement.xp_reward} XP</span>
                  {achievement.earned ? (
                    <span className="text-xs text-polyglot-green">✓ Desbloqueada</span>
                  ) : (
                    <span className="text-xs text-gray-500 flex items-center gap-1"><Lock size={12} /> Bloqueada</span>
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
