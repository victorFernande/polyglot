import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const viteConfig = readFileSync(new URL('../../vite.config.js', import.meta.url), 'utf8')

test('Vite preview disables browser caching for QA pages and fresh bundles', () => {
  assert.match(viteConfig, /preview:\s*{[\s\S]*headers:/)
  assert.match(viteConfig, /Cache-Control['"]?\s*:\s*['"]no-store, no-cache, must-revalidate, proxy-revalidate['"]/, 'preview should force browsers to revalidate index.html and avoid stale QA pending counts')
  assert.match(viteConfig, /Pragma['"]?\s*:\s*['"]no-cache['"]/, 'legacy browser caches should also be disabled')
})
