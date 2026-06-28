import React from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Award } from 'lucide-react'

const leaderboardData = [
  { rank: 1, username: 'Victor', level: 1, total_xp: 0, current_streak: 0, achievements_count: 0 },
]

export default function Leaderboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🏆 Ranking</h1>
        <p className="text-gray-400">Veja como você se compara com outros poliglotas!</p>
      </div>

      {/* Top 3 Podium */}
      <div className="flex justify-center items-end gap-4 mb-8">
        {leaderboardData.slice(0, 3).map((entry, index) => {
          const positions = [1, 0, 2] // 2nd, 1st, 3rd
          const heights = ['h-32', 'h-40', 'h-24']
          const colors = ['bg-gray-400', 'bg-yellow-500', 'bg-orange-600']
          const medals = ['🥈', '🥇', '🥉']
          
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

      {/* Full Table */}
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
                  className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                    entry.username === 'Victor' ? 'bg-polyglot-accent/10' : ''
                  }`}
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {entry.rank <= 3 ? (
                        <span className="text-lg">
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="text-gray-500 w-6 text-center">{entry.rank}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 font-medium">{entry.username}</td>
                  <td className="py-3">
                    <span className="level-badge text-xs">{entry.level}</span>
                  </td>
                  <td className="py-3 xp-text">{entry.total_xp}</td>
                  <td className="py-3">
                    <span className="flex items-center gap-1 text-orange-400">
                      <span>🔥</span> {entry.current_streak}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="flex items-center gap-1 text-polyglot-gold">
                      <Trophy size={14} /> {entry.achievements_count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Your Stats */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Sua Posição</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-polyglot-accent">#1</div>
            <div>
              <p className="font-semibold">Victor</p>
              <p className="text-sm text-gray-400">Nível 1 - Novato</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-polyglot-gold">0 XP</p>
            <p className="text-sm text-gray-400">0 dias de streak</p>
          </div>
        </div>
      </div>
    </div>
  )
}
