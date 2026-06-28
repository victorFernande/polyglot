import React from 'react'
import { User, Mail, Flame, Trophy, Zap, Calendar, Github } from 'lucide-react'

export default function Profile() {
  const profile = {
    username: 'Victor',
    github: 'victorFernande',
    email: 'victor@polyglot.dev',
    level: 1,
    title: 'Novato',
    totalXp: 0,
    currentStreak: 0,
    bestStreak: 0,
    achievements: 0,
    joinedAt: '2026-06-28',
    activeLanguage: 'Escolha livre',
    anchor: 'Rammstein / Chanson / Música Russa / Anime'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">👤 Perfil</h1>
        <p className="text-gray-400">Seu progresso e identidade no Polyglot.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1 text-center">
          <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-polyglot-accent to-polyglot-purple flex items-center justify-center text-5xl mb-4">
            🌍
          </div>
          <h2 className="text-2xl font-bold">{profile.username}</h2>
          <p className="text-gray-400 mb-4">{profile.title}</p>
          <div className="level-badge inline-block">Nível {profile.level}</div>
        </div>

        <div className="card lg:col-span-2">
          <h3 className="text-xl font-semibold mb-4">Informações</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Info icon={<User size={18} />} label="Usuário" value={profile.username} />
            <Info icon={<Github size={18} />} label="GitHub" value={profile.github} />
            <Info icon={<Mail size={18} />} label="Email" value={profile.email} />
            <Info icon={<Calendar size={18} />} label="Desde" value={profile.joinedAt} />
            <Info icon={<Zap size={18} />} label="Idioma atual" value={profile.activeLanguage} />
            <Info icon={<Trophy size={18} />} label="Âncora" value={profile.anchor} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon="✨" label="XP Total" value={profile.totalXp} />
        <Stat icon="🔥" label="Streak Atual" value={`${profile.currentStreak} dias`} />
        <Stat icon="🏅" label="Melhor Streak" value={`${profile.bestStreak} dias`} />
        <Stat icon="🏆" label="Conquistas" value={profile.achievements} />
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Preferências de estudo</h3>
        <div className="space-y-3 text-gray-300">
          <p>• Método principal: ondas focadas, uma língua por vez.</p>
          <p>• Ritmo recomendado: 30–45 minutos por dia.</p>
          <p>• Gamificação: XP, streaks, conquistas e Boss Battles.</p>
          <p>• Conteúdo novo: Hermes adiciona tarefas, vocabulário e exercícios diariamente.</p>
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
