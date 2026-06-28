import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // User state
  user: null,
  stats: null,
  activeWave: null,
  activePhase: null,
  recentLogs: [],
  achievements: [],
  levelInfo: null,
  dailyGoal: null,
  weeklyStats: null,
  
  // Loading states
  loading: false,
  error: null,
  
  // Actions
  setUser: (user) => set({ user }),
  setStats: (stats) => set({ stats }),
  setDashboard: (data) => set({
    user: data.user,
    stats: data.stats,
    activeWave: data.active_wave,
    activePhase: data.active_phase,
    recentLogs: data.recent_logs,
    achievements: data.achievements,
    levelInfo: data.level_info,
    dailyGoal: data.daily_goal_progress,
    weeklyStats: data.weekly_stats
  }),
  
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  // XP animation trigger
  showXpAnimation: false,
  xpAmount: 0,
  triggerXpAnimation: (amount) => set({ showXpAnimation: true, xpAmount: amount }),
  hideXpAnimation: () => set({ showXpAnimation: false }),
  
  // Achievement unlock animation
  newAchievement: null,
  showAchievement: (achievement) => set({ newAchievement: achievement }),
  hideAchievement: () => set({ newAchievement: null })
}))
