const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const DEFAULT_USER_ID = 1

function normalizePath(path) {
  if (path.startsWith('http')) return path
  const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanBase}${cleanPath}`
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(normalizePath(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const detail = data?.detail || data?.message || response.statusText
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }

  return data
}

export function getStoredUserId() {
  const raw = localStorage.getItem('polyglot_user_id')
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_USER_ID
}

export async function bootstrapUser() {
  const storedId = getStoredUserId()
  const user = await apiFetch('/users/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ user_id: storedId }),
  })
  const userId = user?.id || user?.user?.id || storedId
  localStorage.setItem('polyglot_user_id', String(userId))
  return user?.user || user || { id: userId }
}

export async function getDashboard(userId = getStoredUserId()) {
  const user = await bootstrapUser()
  return apiFetch(`/users/${encodeURIComponent(user?.id || userId)}/dashboard`)
}

export async function getAchievements(userId = getStoredUserId()) {
  const user = await bootstrapUser()
  return apiFetch(`/users/${encodeURIComponent(user?.id || userId)}/achievements`)
}

export async function getLeaderboard(limit = 10) {
  return apiFetch(`/leaderboard?limit=${encodeURIComponent(limit)}`)
}

export async function getWaves(userId = getStoredUserId()) {
  const user = await bootstrapUser()
  return apiFetch(`/users/${encodeURIComponent(user?.id || userId)}/waves`)
}

export async function loadExerciseLessons(userId = getStoredUserId()) {
  return apiFetch(`/exercise-lessons?user_id=${encodeURIComponent(userId)}`)
}

export async function startExerciseSession(lessonId, userId = getStoredUserId()) {
  return apiFetch(`/exercise-lessons/${lessonId}/sessions?user_id=${encodeURIComponent(userId)}`, {
    method: 'POST',
  })
}

export async function answerExerciseSession(sessionId, payload) {
  return apiFetch(`/exercise-sessions/${sessionId}/answer`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function completeExerciseSession(sessionId) {
  return apiFetch(`/exercise-sessions/${sessionId}/complete`, {
    method: 'POST',
  })
}
