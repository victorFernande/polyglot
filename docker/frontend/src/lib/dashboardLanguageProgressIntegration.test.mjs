import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const dashboardSource = readFileSync(new URL('../pages/Dashboard.jsx', import.meta.url), 'utf8')
const storeSource = readFileSync(new URL('../stores/useStore.js', import.meta.url), 'utf8')

test('Dashboard stores exercise language progress from the dashboard API payload', () => {
  assert.match(storeSource, /activeLanguageProgress:/)
  assert.match(storeSource, /exerciseLanguageProgress:/)
  assert.match(storeSource, /data\.active_language_progress/)
  assert.match(storeSource, /data\.exercise_language_progress/)
})

test('Dashboard current wave progress renders 1-1000 language exercise progress', () => {
  assert.match(dashboardSource, /activeLanguageProgress/)
  assert.match(dashboardSource, /normalizedLanguageProgress/)
  assert.match(dashboardSource, /languageProgress\.label/)
  assert.match(dashboardSource, /languageProgress\.percent/)
  assert.match(dashboardSource, /CircularLanguageGauge/)
  assert.match(dashboardSource, /conic-gradient/)
  assert.match(dashboardSource, /Progresso total da língua/)
  assert.doesNotMatch(dashboardSource, /Fase Atual/)
  assert.doesNotMatch(dashboardSource, /style=\{\{ width: `\$\{activePhase\.progress_percent\}%` \}\}/)
})

test('Dashboard renders a compact normal gauge list for every exercise language', () => {
  assert.match(dashboardSource, /exerciseLanguageProgress/)
  assert.match(dashboardSource, /languageGaugeSummaries/)
  assert.match(dashboardSource, /Todas as línguas/)
  assert.match(dashboardSource, /LanguageGaugeList/)
  assert.match(dashboardSource, /gauges\.map/)
  assert.match(dashboardSource, /gauge\.language_code/)
})
