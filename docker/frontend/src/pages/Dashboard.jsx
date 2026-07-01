import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, TrendingUp, Target, Award, Clock, BookOpen, Zap } from 'lucide-react'
import { useStore } from '../stores/useStore'
import XPAnimation from '../components/XPAnimation'
import AchievementPopup from '../components/AchievementPopup'
import StreakCalendar from '../components/StreakCalendar'
import WeeklyChart from '../components/WeeklyChart'
import LanguageFlag from '../components/LanguageFlag'
import { getDashboard } from '../lib/api'
import { normalizedLanguageProgress } from '../lib/dashboardLanguageProgress.mjs'

export default function Dashboard() {
  const { 
    user, stats, activeWave, activeLanguageProgress, recentLogs, 
    achievements, levelInfo, dailyGoal, weeklyStats,
    showXpAnimation, xpAmount, newAchievement,
    setDashboard, setLoading, setError 
  } = useStore()
  
  const [refreshing, setRefreshing] = useState(false)
  const languageProgress = normalizedLanguageProgress(activeLanguageProgress)
  const activeLanguageCode = activeLanguageProgress?.language_code || 'de'

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getDashboard()
      setDashboard(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-polyglot-accent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Olá, {user.username}! 👋</h1>
          <p className="text-gray-400 mt-1">Continue sua jornada para se tornar um Poliglota!</p>
        </div>
        <button 
          onClick={() => { setRefreshing(true); fetchDashboard() }}
          className="btn-secondary flex items-center gap-2"
          disabled={refreshing}
        >
          <Zap size={18} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Flame className="text-orange-500" size={28} />}
          value={stats.current_streak}
          label="Dias de Streak"
          suffix="🔥"
        />
        <StatCard 
          icon={<TrendingUp className="text-polyglot-green" size={28} />}
          value={stats.level}
          label="Nível"
          suffix={levelInfo?.title}
        />
        <StatCard 
          icon={<Zap className="text-polyglot-gold" size={28} />}
          value={stats.total_xp}
          label="XP Total"
          suffix="✨"
        />
        <StatCard 
          icon={<BookOpen className="text-polyglot-blue" size={28} />}
          value={stats.vocabulary_count}
          label="Palavras"
          suffix="📚"
        />
      </div>

      {/* Level Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="level-badge">Nível {levelInfo.current_level}</div>
            <span className="text-lg font-semibold">{levelInfo.title}</span>
          </div>
          <span className="text-sm text-gray-400">
            {levelInfo.current_xp} / {levelInfo.xp_for_next_level} XP
          </span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${levelInfo.progress_percent}%` }}
          />
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Faltam {levelInfo.xp_for_next_level - levelInfo.current_xp} XP para o próximo nível
        </p>
      </div>

      {/* Active Wave & Phase */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Wave */}
        <div className="card relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <span className="text-6xl">🌊</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">Onda Atual</h3>
          <div className="flex items-center gap-5 mb-4">
            <CircularLanguageGauge code={activeLanguageCode} percent={languageProgress.percent} />
            <div>
              <p className="text-xl font-bold">{activeWave.language_name}</p>
              <p className="text-sm text-gray-400">Âncora: 🎸 {activeWave.anchor}</p>
              <p className="mt-1 text-xs text-gray-500">Progresso total da língua: {languageProgress.completed} de {languageProgress.total}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Progresso</span>
              <span>{languageProgress.label}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${languageProgress.percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{languageProgress.percent}% da trilha da língua</p>
          </div>
          <div className="mt-4 flex gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Clock size={14} /> {activeWave.hours_input.toFixed(1)}h
            </span>
            <span className="flex items-center gap-1">
              <BookOpen size={14} /> {activeWave.vocabulary_count} palavras
            </span>
          </div>
        </div>

      </div>

      {/* Daily Goals & Weekly Stats */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target size={20} className="text-polyglot-accent" />
            Metas de Hoje
          </h3>
          <div className="space-y-4">
            <GoalProgress 
              label="Estudo Total" 
              current={dailyGoal.study_current_minutes} 
              goal={dailyGoal.study_goal_minutes}
              unit="min"
            />
            <GoalProgress 
              label="Input (Ouvir/Ler)" 
              current={dailyGoal.input_current_minutes} 
              goal={dailyGoal.input_goal_minutes}
              unit="min"
            />
            <GoalProgress 
              label="SRS (Anki)" 
              current={dailyGoal.srs_current_minutes} 
              goal={dailyGoal.srs_goal_minutes}
              unit="min"
            />
          </div>
          {dailyGoal.completed && (
            <div className="mt-4 p-3 bg-polyglot-green/20 rounded-lg text-center">
              <span className="text-polyglot-green font-bold">🎉 Meta diária completa!</span>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-polyglot-blue" />
            Semana em Números
          </h3>
          <WeeklyChart data={weeklyStats?.daily_breakdown || {}} />
          <div className="grid grid-cols-3 gap-4 mt-4 text-center">
            <div>
              <p className="stat-value">{weeklyStats?.total_minutes || 0}</p>
              <p className="stat-label">Minutos</p>
            </div>
            <div>
              <p className="stat-value">{weeklyStats?.total_xp || 0}</p>
              <p className="stat-label">XP</p>
            </div>
            <div>
              <p className="stat-value">{weeklyStats?.sessions_count || 0}</p>
              <p className="stat-label">Sessões</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Atividade Recente</h3>
        <div className="space-y-3">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <ActivityIcon type={log.activity_type} />
                <div>
                  <p className="font-medium capitalize">{log.activity_type}</p>
                  <p className="text-sm text-gray-400">{log.notes}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">{log.duration_minutes} min</p>
                <p className="text-sm xp-text">+{log.xp_earned} XP</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Animations */}
      <AnimatePresence>
        {showXpAnimation && <XPAnimation amount={xpAmount} />}
        {newAchievement && <AchievementPopup achievement={newAchievement} />}
      </AnimatePresence>
    </div>
  )
}

function CircularLanguageGauge({ code, percent }) {
  const safePercent = Math.max(0, Math.min(100, Number(percent || 0)))
  return (
    <div
      className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(#22d3ee ${safePercent}%, rgba(255,255,255,0.12) 0)` }}
      aria-label={`Progresso da língua ${safePercent}%`}
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-polyglot-dark/95 shadow-inner shadow-black/40">
        <LanguageFlag code={code} className="h-10 w-10 rounded-full" />
      </div>
      <div className="absolute -bottom-1 rounded-full border border-cyan-300/40 bg-black/70 px-2 py-0.5 text-[10px] font-bold text-cyan-100">
        {safePercent}%
      </div>
    </div>
  )
}

function StatCard({ icon, value, label, suffix }) {
  return (
    <div className="stat-card">
      <div className="mb-2">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {suffix && <div className="text-xs text-gray-500 mt-1">{suffix}</div>}
    </div>
  )
}

function GoalProgress({ label, current, goal, unit }) {
  const percent = Math.min((current / goal) * 100, 100)
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-400">{current}/{goal} {unit}</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function ActivityIcon({ type }) {
  const icons = {
    input: <BookOpen size={20} className="text-polyglot-blue" />,
    srs: <Zap size={20} className="text-polyglot-gold" />,
    shadowing: <Flame size={20} className="text-orange-500" />,
    production: <Award size={20} className="text-polyglot-purple" />
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
      {icons[type] || <Zap size={20} />}
    </div>
  )
}
