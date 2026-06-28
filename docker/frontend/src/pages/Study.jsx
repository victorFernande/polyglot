import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Clock, BookOpen, Mic, Headphones, CheckCircle } from 'lucide-react'
import { useStore } from '../stores/useStore'

const activityTypes = [
  { id: 'input', name: 'Input', icon: <Headphones size={24} />, color: 'bg-blue-600', description: 'Ouvir música, podcast, assistir vídeo' },
  { id: 'srs', name: 'SRS (Anki)', icon: <BookOpen size={24} />, color: 'bg-yellow-600', description: 'Revisar flashcards com spaced repetition' },
  { id: 'shadowing', name: 'Shadowing', icon: <Mic size={24} />, color: 'bg-orange-600', description: 'Repetir em voz alta imitando o nativo' },
  { id: 'production', name: 'Produção', icon: <BookOpen size={24} />, color: 'bg-purple-600', description: 'Falar sozinho, escrever, criar frases' },
]

export default function Study() {
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [duration, setDuration] = useState(15)
  const [notes, setNotes] = useState('')
  const [isStudying, setIsStudying] = useState(false)
  const [timer, setTimer] = useState(0)
  const [sessionComplete, setSessionComplete] = useState(false)
  const { triggerXpAnimation } = useStore()

  const startStudy = () => {
    setIsStudying(true)
    setTimer(0)
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev >= duration * 60) {
          clearInterval(interval)
          completeSession()
          return prev
        }
        return prev + 1
      })
    }, 1000)
  }

  const completeSession = () => {
    setIsStudying(false)
    setSessionComplete(true)
    
    // Calcular XP (simulação)
    const baseXP = {
      input: 5,
      srs: 10,
      shadowing: 15,
      production: 20
    }
    const xp = Math.floor((baseXP[selectedActivity] || 5) * (duration / 15))
    triggerXpAnimation(xp)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (sessionComplete) {
    return (
      <div className="space-y-6">
        <div className="card text-center py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10 }}
          >
            <CheckCircle size={64} className="text-polyglot-green mx-auto mb-4" />
          </motion.div>
          <h2 className="text-3xl font-bold mb-2">Sessão Completa! 🎉</h2>
          <p className="text-gray-400 mb-6">Você estudou por {duration} minutos</p>
          <div className="text-4xl font-bold text-polyglot-gold mb-6">
            +{Math.floor(({
              input: 5,
              srs: 10,
              shadowing: 15,
              production: 20
            }[selectedActivity] || 5) * (duration / 15))} XP
          </div>
          <button 
            onClick={() => { setSessionComplete(false); setSelectedActivity(null); setNotes('') }}
            className="btn-primary"
          >
            Nova Sessão
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">📚 Sessão de Estudo</h1>
        <p className="text-gray-400">Escolha o tipo de atividade e comece a estudar!</p>
      </div>

      {!selectedActivity ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activityTypes.map((activity) => (
            <motion.button
              key={activity.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedActivity(activity.id)}
              className="card text-left hover:bg-white/5 transition-colors"
            >
              <div className={`w-12 h-12 ${activity.color} rounded-xl flex items-center justify-center mb-4`}>
                {activity.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{activity.name}</h3>
              <p className="text-gray-400 text-sm">{activity.description}</p>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Timer Display */}
          <div className="card text-center py-8">
            <div className="text-6xl font-mono font-bold mb-4">
              {isStudying ? formatTime(timer) : formatTime(duration * 60)}
            </div>
            <div className="text-gray-400 mb-6">
              {isStudying ? 'Estudando...' : 'Pronto para começar?'}
            </div>
            
            {!isStudying && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Duração (minutos)</label>
                  <div className="flex justify-center gap-2">
                    {[5, 10, 15, 20, 30, 45].map((min) => (
                      <button
                        key={min}
                        onClick={() => setDuration(min)}
                        className={`px-4 py-2 rounded-lg transition-all ${
                          duration === min 
                            ? 'bg-polyglot-accent text-white' 
                            : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                      >
                        {min}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Notas (opcional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Revisão de vocabulário, Shadowing 'Sonne'..."
                    className="w-full max-w-md mx-auto px-4 py-2 bg-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-polyglot-accent"
                  />
                </div>
                
                <button onClick={startStudy} className="btn-primary flex items-center gap-2 mx-auto">
                  <Play size={20} />
                  Começar Sessão
                </button>
              </div>
            )}
            
            {isStudying && (
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => setIsStudying(false)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Pause size={20} />
                  Pausar
                </button>
                <button 
                  onClick={completeSession}
                  className="btn-primary flex items-center gap-2"
                >
                  <CheckCircle size={20} />
                  Finalizar
                </button>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">💡 Dicas para {activityTypes.find(a => a.id === selectedActivity)?.name}</h3>
            <div className="space-y-2 text-gray-300">
              {selectedActivity === 'input' && (
                <>
                  <p>• Ouça "Sonne" com a letra ao lado</p>
                  <p>• Foque na pronúncia, não na tradução</p>
                  <p>• Tente identificar palavras que já conhece</p>
                </>
              )}
              {selectedActivity === 'srs' && (
                <>
                  <p>• Revise os cards do deck Anki</p>
                  <p>• Diga a palavra em voz alta antes de virar</p>
                  <p>• Foque nos cards difíceis</p>
                </>
              )}
              {selectedActivity === 'shadowing' && (
                <>
                  <p>• Ouça uma frase → repita imediatamente</p>
                  <p>• Imita a entonação de Till Lindemann</p>
                  <p>• Comece devagar, aumente a velocidade</p>
                </>
              )}
              {selectedActivity === 'production' && (
                <>
                  <p>• Descreva seu dia em alemão</p>
                  <p>• Escreva 5 frases com palavras novas</p>
                  <p>• Grave-se e compare com o original</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
