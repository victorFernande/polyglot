import { readFileSync } from 'node:fs'

const api = readFileSync(new URL('./src/lib/api.js', import.meta.url), 'utf8')
const dashboard = readFileSync(new URL('./src/pages/Dashboard.jsx', import.meta.url), 'utf8')
const waves = readFileSync(new URL('./src/pages/Waves.jsx', import.meta.url), 'utf8')
const profile = readFileSync(new URL('./src/pages/Profile.jsx', import.meta.url), 'utf8')
const achievements = readFileSync(new URL('./src/pages/Achievements.jsx', import.meta.url), 'utf8')
const leaderboard = readFileSync(new URL('./src/pages/Leaderboard.jsx', import.meta.url), 'utf8')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

assert(api.includes("const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'"), 'apiFetch deve usar /api relativo por padrão')
assert(api.includes("apiFetch('/users/bootstrap'") || api.includes('apiFetch(`/users/bootstrap`'), 'bootstrapUser deve chamar /users/bootstrap diretamente')
assert(!api.includes('/bootstrap`, options'), 'bootstrapUser não deve tentar rota inexistente /users/{id}/bootstrap')
assert(api.includes("localStorage.setItem('polyglot_user_id'"), 'bootstrapUser deve persistir o id do usuário Victor no localStorage')
assert(api.includes('getDashboard') && api.includes('/dashboard'), 'api.js deve expor getDashboard usando endpoint real')
assert(api.includes('getAchievements') && api.includes('/achievements'), 'api.js deve expor getAchievements usando endpoint real')
assert(api.includes('getLeaderboard') && api.includes('/leaderboard'), 'api.js deve expor getLeaderboard usando endpoint real')
assert(api.includes('getWaves') && api.includes('/waves'), 'api.js deve expor getWaves usando endpoint real')

for (const [name, source] of Object.entries({ Dashboard: dashboard, Waves: waves, Profile: profile, Achievements: achievements, Leaderboard: leaderboard })) {
  assert(source.includes('../lib/api'), `${name} deve consumir o cliente API compartilhado`)
  assert(!/const\s+\w*(Mock|Data|mock)\w*\s*=\s*\[/.test(source), `${name} não deve declarar arrays mockados locais`)
  assert(!source.includes('http://localhost'), `${name} não deve apontar para localhost no navegador`)
}

console.log('api-connected frontend source checks passed')
