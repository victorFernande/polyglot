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

function optionSeed(item, suffix) {
  return `${item?.id ?? item?.prompt ?? ''}:${suffix}`
}

function answerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  return answer
}

function matchPairs(item) {
  if (Array.isArray(item?.pairs)) return item.pairs
  if (item?.answer?.pairs) return item.answer.pairs
  if (item?.answer && typeof item.answer === 'object') return Object.entries(item.answer)
  return []
}

export function buildTilesForItem(item) {
  if (item?.tiles?.length) return [...item.tiles]
  return stableShuffleOptions(answerValue(item?.answer) || [], optionSeed(item, 'build'))
}

export function matchRightOptions(item) {
  const rights = matchPairs(item).map(([, right]) => right)
  return stableShuffleOptions(rights, optionSeed(item, 'match-rights'))
}
