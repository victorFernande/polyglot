import React, { useEffect, useState } from 'react'
import { User, Mail, Flame, Trophy, Zap, Calendar, Github } from 'lucide-react'
import { getDashboard } from '../lib/api'

export default function Profile() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    setError(null)
    try {
      setDashboard(await getDashboard())
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
    return <div className="card border border-red-500/30 text-red-300">Erro ao carregar perfil: {error}</div>
  }

  const { user, stats, level_info: levelInfo, active_wave: activeWave } = dashboard
  const joinedAt = new Date(user.created_at).toLocaleDateString('pt-BR')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">👤 Perfil</h1>
        <p className="text-gray-400">Seu progresso e identidade no Polyglot, lidos direto da API.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1 text-center">
          <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-polyglot-accent to-polyglot-purple flex items-center justify-center text-5xl mb-4">🌍</div>
          <h2 className="text-2xl font-bold">{user.username}</h2>
          <p className="text-gray-400 mb-4">{levelInfo.title}</p>
          <div className="level-badge inline-block">Nível {levelInfo.current_level}</div>
        </div>

        <div className="card lg:col-span-2">
          <h3 className="text-xl font-semibold mb-4">Informações</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Info icon={<User size={18} />} label="Usuário" value={user.username} />
            <Info icon={<Github size={18} />} label="GitHub" value="victorFernande" />
            <Info icon={<Mail size={18} />} label="Email" value={user.email} />
            <Info icon={<Calendar size={18} />} label="Desde" value={joinedAt} />
            <Info icon={<Zap size={18} />} label="Idioma atual" value={activeWave?.language_name || 'Escolha livre'} />
            <Info icon={<Trophy size={18} />} label="Âncora" value={activeWave?.anchor || 'Ondas livres'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon="✨" label="XP Total" value={stats.total_xp} />
        <Stat icon="🔥" label="Streak Atual" value={`${stats.current_streak} dias`} />
        <Stat icon="🏅" label="Melhor Streak" value={`${stats.best_streak} dias`} />
        <Stat icon="🏆" label="Conquistas" value={stats.achievements_count} />
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Flame size={20} className="text-orange-400" />Preferências de estudo</h3>
        <div className="space-y-3 text-gray-300">
          <p>• Método principal: ondas focadas, com progresso persistido pelo backend.</p>
          <p>• Ritmo recomendado: 30–45 minutos por dia.</p>
          <p>• Gamificação: XP, streaks, conquistas e Boss Battles.</p>
          <p>• O dashboard, conquistas e ranking agora refletem o mesmo usuário Victor.</p>
        </div>
      </div>
    </div>
  )
}

function Info({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
      <div className="text-polyglot-accent">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat-card">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
