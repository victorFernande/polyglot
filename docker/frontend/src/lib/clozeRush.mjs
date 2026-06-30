const DEFAULT_MAX_CARDS = 5
const DEFAULT_MIN_CHIPS = 3
const DEFAULT_MAX_CHIPS = 5

function rawAnswerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  return answer
}

function normalizeToken(token) {
  return String(token ?? '')
    .normalize('NFC')
    .trim()
    .replace(/^\p{P}+|\p{P}+$/gu, '')
}

function normalizeComparable(value) {
  return String(value ?? '')
    .normalize('NFC')
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hashString(text) {
  let hash = 2166136261
  for (const char of String(text)) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function clozeRushSeed({ lesson, session, currentIndex } = {}) {
  return `${lesson?.id ?? 'lesson'}:${session?.id ?? 'session'}:${currentIndex ?? 0}`
}

function answerTokens(answer) {
  const value = rawAnswerValue(answer)
  if (Array.isArray(value) && value.every((part) => typeof part === 'string')) {
    return value.map(normalizeToken).filter(Boolean)
  }
  if (typeof value !== 'string') return []
  const text = value.trim().replace(/\s+/g, ' ')
  if (!text.includes(' ')) return []
  return text.split(' ').map(normalizeToken).filter(Boolean)
}

function uniqueTokens(tokens) {
  const seen = new Set()
  const result = []
  for (const token of tokens) {
    const key = normalizeComparable(token)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(token)
  }
  return result
}

function deterministicOrder(seed, token) {
  return hashString(`${seed}:${normalizeComparable(token)}`)
}

function chooseMissingToken(tokens, seed) {
  const candidates = tokens
    .map((token, index) => ({ token, index, order: deterministicOrder(seed, `${index}:${token}`) }))
    .filter(({ token }) => Array.from(normalizeComparable(token)).length >= 2)
    .sort((a, b) => a.order - b.order || a.index - b.index)
  return candidates[0] || null
}

function buildChips(missingToken, allTokens, seed, options = {}) {
  const minChips = options.minChips ?? DEFAULT_MIN_CHIPS
  const maxChips = options.maxChips ?? DEFAULT_MAX_CHIPS
  const missingKey = normalizeComparable(missingToken)
  const distractors = uniqueTokens(allTokens)
    .filter((token) => normalizeComparable(token) !== missingKey)
    .sort((a, b) => deterministicOrder(seed, a) - deterministicOrder(seed, b) || a.localeCompare(b))
    .slice(0, Math.max(0, maxChips - 1))
  const chips = uniqueTokens([missingToken, ...distractors])
    .sort((a, b) => deterministicOrder(`${seed}:chips`, a) - deterministicOrder(`${seed}:chips`, b) || a.localeCompare(b))
  return chips.length >= minChips ? chips : []
}

export function extractClozeRushAnswerText(answer) {
  const tokens = answerTokens(answer)
  return tokens.join(' ').trim().replace(/\s+/g, ' ')
}

export function clozeRushPrompt(prompt, answer) {
  const text = String(prompt ?? '').trim().replace(/\s+/g, ' ')
  const normalizedAnswer = normalizeComparable(answer)
  return text.replace(/\s*\(([^()]*)\)\s*$/u, (match, inner) => (
    normalizeComparable(inner) === normalizedAnswer ? '' : match.trimEnd()
  ))
}

export function buildClozeRushQueue(items = [], context = {}, options = {}) {
  const maxCards = options.maxCards ?? DEFAULT_MAX_CARDS
  const seed = clozeRushSeed(context)
  const itemTokens = items.map((item) => answerTokens(item?.answer))
  const allTokens = itemTokens.flat()

  const cards = items
    .map((item, index) => {
      const tokens = itemTokens[index]
      if (tokens.length < 2) return null
      const cardSeed = `${seed}:${item?.id ?? index}`
      const missing = chooseMissingToken(tokens, cardSeed)
      if (!missing) return null
      const chips = buildChips(missing.token, allTokens, cardSeed, options)
      if (!chips.length) return null
      const fullText = tokens.join(' ')
      return {
        id: item?.id ?? `cloze-rush-${index}`,
        prompt: clozeRushPrompt(item?.prompt, fullText),
        fullText,
        clozeText: tokens.map((token, tokenIndex) => (tokenIndex === missing.index ? '____' : token)).join(' '),
        missingToken: missing.token,
        chips,
        explanation: item?.explanation || '',
        seed: cardSeed,
        order: hashString(`${cardSeed}:${fullText}`),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)))
    .slice(0, maxCards)

  const rotateBy = cards.length ? Math.abs(Number(context.currentIndex) || 0) % cards.length : 0
  return cards
    .slice(rotateBy)
    .concat(cards.slice(0, rotateBy))
    .map(({ order, ...card }) => card)
}

export function validateClozeRushSelection(selection, card) {
  const expected = card?.missingToken ?? ''
  const fullText = card?.fullText ?? ''
  return {
    status: normalizeComparable(selection) === normalizeComparable(expected) ? 'correct' : 'wrong',
    expected,
    fullText,
  }
}
