import React from 'react'
import { motion } from 'framer-motion'

export default function AchievementPopup({ achievement }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, x: '100%' }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 20 }}
      className="fixed top-20 right-4 z-50"
    >
      <div className="bg-gradient-to-r from-polyglot-purple to-polyglot-accent p-4 rounded-xl shadow-2xl border border-white/20 max-w-sm">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{achievement.icon}</span>
          <div>
            <p className="text-sm text-white/80 uppercase tracking-wider">Conquista Desbloqueada!</p>
            <p className="text-lg font-bold text-white">{achievement.name}</p>
            <p className="text-sm text-white/70">{achievement.description}</p>
            <p className="text-sm text-polyglot-gold mt-1">+{achievement.xp_reward} XP</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
