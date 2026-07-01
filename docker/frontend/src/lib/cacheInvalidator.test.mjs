import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { buildVersionUrl, shouldReloadForBuildVersion } from './cacheInvalidator.mjs'

const appSource = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8')
const viteConfig = readFileSync(new URL('../../vite.config.js', import.meta.url), 'utf8')

test('build version URL is cache-busted for every check', () => {
  const url = buildVersionUrl('abc123')

  assert.match(url, /^\/version\.json\?t=abc123$/)
})

test('reload is required only when deployed build id changes', () => {
  assert.equal(shouldReloadForBuildVersion({ currentBuildId: 'a', remoteBuildId: 'b', lastReloadedBuildId: null }), true)
  assert.equal(shouldReloadForBuildVersion({ currentBuildId: 'a', remoteBuildId: 'a', lastReloadedBuildId: null }), false)
  assert.equal(shouldReloadForBuildVersion({ currentBuildId: 'a', remoteBuildId: 'b', lastReloadedBuildId: 'b' }), false)
  assert.equal(shouldReloadForBuildVersion({ currentBuildId: '', remoteBuildId: 'b', lastReloadedBuildId: null }), false)
  assert.equal(shouldReloadForBuildVersion({ currentBuildId: 'a', remoteBuildId: '', lastReloadedBuildId: null }), false)
})

test('App installs cache invalidator globally so all routes refresh to new deploys', () => {
  assert.match(appSource, /useCacheInvalidator\(\)/)
  assert.match(appSource, /cacheInvalidator/)
})

test('Vite emits a version file and build id for deployed refresh invalidation', () => {
  assert.match(viteConfig, /VITE_BUILD_ID/)
  assert.match(viteConfig, /version\.json/)
  assert.match(viteConfig, /generateBundle/)
})
