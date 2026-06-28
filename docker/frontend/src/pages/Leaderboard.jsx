import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { getLeaderboard } from '../lib/api'

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  async function loadLeaderboard() {
    setLoading(true)
    setError(null)
    try {
      setLeaderboardData(await getLeaderboard(10))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const victor = leaderboardData.find(entry => entry.username === 'Victor')

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-polyglot-accent" /></div>
  }

  if (error) {
    return <div className="card border border-red-500/30 text-red-300">Erro ao carregar ranking: {error}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🏆 Ranking</h1>
        <p className="text-gray-400">Ranking alimentado pelo XP e streak persistidos na API.</p>
      </div>

      <div className="flex justify-center items-end gap-4 mb-8">
        {leaderboardData.slice(0, 3).map((entry, index) => {
          const heights = ['h-40', 'h-32', 'h-24']
          const colors = ['bg-yellow-500', 'bg-gray-400', 'bg-orange-600']
          const medals = ['🥇', '🥈', '🥉']
          return (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="text-4xl mb-2">{medals[index]}</div>
              <div className="text-sm font-semibold mb-1">{entry.username}</div>
              <div className="text-xs text-gray-400 mb-2">{entry.total_xp} XP</div>
              <div className={`w-20 ${heights[index]} ${colors[index]} rounded-t-lg flex items-center justify-center`}>
                <span className="text-2xl font-bold text-white">{entry.rank}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Classificação Completa</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-white/10">
                <th className="pb-3">Posição</th>
                <th className="pb-3">Usuário</th>
                <th className="pb-3">Nível</th>
                <th className="pb-3">XP</th>
                <th className="pb-3">Streak</th>
                <th className="pb-3">Conquistas</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {leaderboardData.map((entry) => (
                <tr
                  key={entry.rank}
                  className={`border-b border-white/5 hover:bg-white/5 transition-colors ${entry.username === 'Victor' ? 'bg-polyglot-accent/10' : ''}`}
                >
                  <td className="py-3">
                    {entry.rank <= 3 ? <span className="text-lg">{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}</span> : <span className="text-gray-500 w-6 text-center">{entry.rank}</span>}
                  </td>
                  <td className="py-3 font-medium">{entry.username}</td>
                  <td className="py-3"><span className="level-badge text-xs">{entry.level}</span></td>
                  <td className="py-3 xp-text">{entry.total_xp}</td>
                  <td className="py-3"><span className="flex items-center gap-1 text-orange-400"><span>🔥</span> {entry.current_streak}</span></td>
                  <td className="py-3"><span className="flex items-center gap-1 text-polyglot-gold"><Trophy size={14} /> {entry.achievements_count}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!leaderboardData.length && <p className="text-gray-400 py-6">Nenhum usuário encontrado na API.</p>}
        </div>
      </div>

      {victor && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Sua Posição</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-polyglot-accent">#{victor.rank}</div>
              <div>
                <p className="font-semibold">{victor.username}</p>
                <p className="text-sm text-gray-400">Nível {victor.level}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-polyglot-gold">{victor.total_xp} XP</p>
              <p className="text-sm text-gray-400">{victor.current_streak} dias de streak</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
