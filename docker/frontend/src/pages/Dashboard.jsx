import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, TrendingUp, Target, Award, Clock, BookOpen, Zap } from 'lucide-react'
import { useStore } from '../stores/useStore'
import XPAnimation from '../components/XPAnimation'
import AchievementPopup from '../components/AchievementPopup'
import StreakCalendar from '../components/StreakCalendar'
import WeeklyChart from '../components/WeeklyChart'
import LanguageFlag from '../components/LanguageFlag'

export default function Dashboard() {
  const { 
    user, stats, activeWave, activePhase, recentLogs, 
    achievements, levelInfo, dailyGoal, weeklyStats,
    showXpAnimation, xpAmount, newAchievement,
    setDashboard, setLoading, setError 
  } = useStore()
  
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      // Estado inicial sem progresso falso. A persistência real entra pela API.
      const initialData = {
        user: { id: 1, username: 'Victor', email: 'victor@polyglot.dev', created_at: new Date().toISOString(), total_xp: 0, level: 1, current_streak: 0, best_streak: 0, last_study_date: null },
        stats: { total_xp: 0, level: 1, current_streak: 0, best_streak: 0, total_hours: 0, vocabulary_count: 0, phrases_count: 0, achievements_count: 0, next_level_xp: 100, progress_percent: 0 },
        active_wave: { id: 1, wave_number: 1, language: 'german', language_name: 'Alemão', anchor: 'Rammstein', status: 'active', total_xp: 0, vocabulary_count: 0, phrases_count: 0, hours_input: 0 },
        active_phase: { id: 1, phase_number: 1, name: 'O Despertar', status: 'active', xp_earned: 0, tasks_completed: 0, total_tasks: 7, progress_percent: 0 },
        recent_logs: [],
        achievements: [
          { id: 1, code: 'first_step', name: 'Primeiro Passo', description: 'Complete sua primeira tarefa', icon: '👣', xp_reward: 10, earned: false },
          { id: 2, code: 'streak_3', name: 'Fogo Baixo', description: '3 dias de streak', icon: '🔥', xp_reward: 30, earned: false },
          { id: 3, code: 'vocab_50', name: 'Colecionador', description: 'Aprenda 50 palavras', icon: '📚', xp_reward: 50, earned: false },
        ],
        level_info: { current_level: 1, current_xp: 0, xp_for_next_level: 100, progress_percent: 0, title: 'Novato' },
        daily_goal_progress: { study_goal_minutes: 45, study_current_minutes: 0, study_percent: 0, input_goal_minutes: 20, input_current_minutes: 0, input_percent: 0, srs_goal_minutes: 10, srs_current_minutes: 0, srs_percent: 0, completed: false },
        weekly_stats: { total_minutes: 0, total_xp: 0, sessions_count: 0, daily_average: 0, daily_breakdown: {} }
      }
      setDashboard(initialData)
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
          <div className="flex items-center gap-4 mb-4">
            <LanguageFlag code="de" className="h-12 w-12" />
            <div>
              <p className="text-xl font-bold">{activeWave.language_name}</p>
              <p className="text-sm text-gray-400">Âncora: 🎸 {activeWave.anchor}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Progresso</span>
              <span>{activePhase.tasks_completed}/{activePhase.total_tasks} tarefas</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${activePhase.progress_percent}%` }}
              />
            </div>
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

        {/* Active Phase */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Fase Atual: {activePhase.name}</h3>
          <div className="space-y-3">
            {[
              { title: 'Alfabeto Alemão', completed: false, xp: 10 },
              { title: 'Vogais Umlaut', completed: false, xp: 10 },
              { title: 'Consoantes Duras', completed: false, xp: 10 },
              { title: 'R Gutural', completed: false, xp: 15 },
              { title: 'Entonação', completed: false, xp: 10 },
              { title: "Shadowing 'Sonne'", completed: false, xp: 20 },
              { title: 'Checkpoint FASE 1', completed: false, xp: 25 },
            ].map((task, i) => (
              <div 
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  task.completed ? 'bg-polyglot-green/10 border border-polyglot-green/30' : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    task.completed 
                      ? 'bg-polyglot-green border-polyglot-green' 
                      : 'border-gray-500'
                  }`}>
                    {task.completed && <span className="text-xs">✓</span>}
                  </div>
                  <span className={task.completed ? 'line-through text-gray-500' : ''}>
                    {task.title}
                  </span>
                </div>
                <span className="text-sm xp-text">+{task.xp} XP</span>
              </div>
            ))}
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
