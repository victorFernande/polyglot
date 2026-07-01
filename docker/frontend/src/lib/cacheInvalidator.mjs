import { useEffect } from 'react'

const BUILD_VERSION_PATH = '/version.json'
const RELOADED_BUILD_STORAGE_KEY = 'polyglot:last-reloaded-build-id'

export function buildVersionUrl(cacheBuster = Date.now()) {
  return `${BUILD_VERSION_PATH}?t=${encodeURIComponent(String(cacheBuster))}`
}

export function shouldReloadForBuildVersion({ currentBuildId, remoteBuildId, lastReloadedBuildId }) {
  if (!currentBuildId || !remoteBuildId) return false
  if (currentBuildId === remoteBuildId) return false
  return lastReloadedBuildId !== remoteBuildId
}

async function clearBrowserCaches() {
  if (typeof window === 'undefined') return
  if ('caches' in window) {
    try {
      const cacheNames = await window.caches.keys()
      await Promise.all(cacheNames.map((name) => window.caches.delete(name)))
    } catch (_error) {
      // Cache deletion is best-effort; reload should still proceed.
    }
  }
  if ('serviceWorker' in window.navigator) {
    try {
      const registrations = await window.navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    } catch (_error) {
      // Service worker cleanup is best-effort.
    }
  }
}

export async function checkForFreshDeploy({
  currentBuildId = import.meta.env?.VITE_BUILD_ID,
  fetchImpl = typeof fetch === 'function' ? fetch : null,
  storage = typeof window !== 'undefined' ? window.localStorage : null,
  location = typeof window !== 'undefined' ? window.location : null,
  now = Date.now,
} = {}) {
  if (!fetchImpl || !storage || !location || !currentBuildId) return false

  const response = await fetchImpl(buildVersionUrl(now()), { cache: 'no-store' })
  if (!response.ok) return false
  const version = await response.json()
  const remoteBuildId = version?.buildId
  const lastReloadedBuildId = storage.getItem(RELOADED_BUILD_STORAGE_KEY)

  if (!shouldReloadForBuildVersion({ currentBuildId, remoteBuildId, lastReloadedBuildId })) {
    if (remoteBuildId === currentBuildId) storage.removeItem(RELOADED_BUILD_STORAGE_KEY)
    return false
  }

  storage.setItem(RELOADED_BUILD_STORAGE_KEY, remoteBuildId)
  await clearBrowserCaches()
  location.reload()
  return true
}

export function useCacheInvalidator() {
  useEffect(() => {
    let cancelled = false
    const check = () => {
      if (cancelled) return
      checkForFreshDeploy().catch(() => {})
    }

    check()
    const interval = window.setInterval(check, 60_000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check()
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])
}
