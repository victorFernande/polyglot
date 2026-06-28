function hashSeed(seed) {
  const text = String(seed ?? '')
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function nextRandom(state) {
  let value = state >>> 0
  value ^= value << 13
  value ^= value >>> 17
  value ^= value << 5
  return value >>> 0
}

export function stableShuffleOptions(options, seed) {
  const shuffled = [...(options || [])]
  let state = hashSeed(seed)

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    state = nextRandom(state || 1)
    const j = state % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}
