import React from 'react'
import { motion } from 'framer-motion'

export default function XPAnimation({ amount }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.5 }}
      animate={{ opacity: 1, y: -100, scale: 1.2 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
    >
      <div className="text-4xl font-bold text-polyglot-gold drop-shadow-lg">
        +{amount} XP ✨
      </div>
    </motion.div>
  )
}
