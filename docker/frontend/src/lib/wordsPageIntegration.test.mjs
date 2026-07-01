import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8')
const layoutSource = readFileSync(new URL('../components/Layout.jsx', import.meta.url), 'utf8')
const dashboardSource = readFileSync(new URL('../pages/Dashboard.jsx', import.meta.url), 'utf8')
const apiSource = readFileSync(new URL('./api.js', import.meta.url), 'utf8')
const wordsSource = readFileSync(new URL('../pages/Words.jsx', import.meta.url), 'utf8')

test('Words page is routed and reachable from navigation and dashboard word card', () => {
  assert.match(appSource, /import Words from '\.\/pages\/Words'/)
  assert.match(appSource, /<Route path="\/words" element=\{<Words \/>\}/)
  assert.match(layoutSource, /path: '\/words'/)
  assert.match(layoutSource, /label: 'Palavras'/)
  assert.match(dashboardSource, /to="\/words"/)
  assert.match(apiSource, /loadLearnedWords/)
})

test('Words page renders a two-column learned word table with language grouping', () => {
  assert.match(wordsSource, /loadLearnedWords/)
  assert.match(wordsSource, /Palavra/)
  assert.match(wordsSource, /Tradução/)
  assert.match(wordsSource, /language\.words\.map/)
  assert.match(wordsSource, /word\.translation_pt/)
})
