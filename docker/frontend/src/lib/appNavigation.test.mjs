import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const layoutSource = readFileSync(new URL('../components/Layout.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8')

test('sidebar navigation excludes dead Waves and Study pages', () => {
  assert.doesNotMatch(layoutSource, /label:\s*['"]Ondas['"]/) 
  assert.doesNotMatch(layoutSource, /path:\s*['"]\/waves['"]/) 
  assert.doesNotMatch(layoutSource, /label:\s*['"]Estudar['"]/) 
  assert.doesNotMatch(layoutSource, /path:\s*['"]\/study['"]/) 
})

test('app routes exclude removed Waves and Study pages', () => {
  assert.doesNotMatch(appSource, /pages\/Waves/)
  assert.doesNotMatch(appSource, /pages\/Study/)
  assert.doesNotMatch(appSource, /path=['"]\/waves['"]/) 
  assert.doesNotMatch(appSource, /path=['"]\/study['"]/) 
})
