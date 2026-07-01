import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const appSource = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8')
const layoutSource = readFileSync(new URL('../components/Layout.jsx', import.meta.url), 'utf8')

test('app exposes a separate Exercícios QA route for layout review before production merge', () => {
  assert.match(appSource, /import ExercisesQA from ['"]\.\/pages\/ExercisesQA['"]/, 'App should import the QA exercise page')
  assert.match(appSource, /<Route path="\/exercises-qa" element={<ExercisesQA \/>} \/>/, 'App should route /exercises-qa to the QA page')
})

test('sidebar exposes Exercícios QA separately from production Exercícios', () => {
  assert.match(layoutSource, /path: '\/exercises-qa', label: 'Exercícios QA'/, 'Sidebar should link to the QA exercise page')
  assert.match(layoutSource, /path: '\/exercises', label: 'Exercícios'/, 'Production exercises link should remain available')
})
