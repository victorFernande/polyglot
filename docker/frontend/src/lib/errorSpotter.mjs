const DEFAULT_MAX_CARDS = 6
const DEFAULT_MIN_CARDS = 3
const BUILD_LIKE_TYPES = new Set(['build', 'listen_build'])

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

function uniqueTokens(tokens) {
  const seen = new Set()
  const result = []
  for (const token of tokens) {
    const normalized = normalizeToken(token)
    const key = normalizeComparable(normalized)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
  }
  return result
}

function answerTokens(answer) {
  const value = rawAnswerValue(answer)
  if (!Array.isArray(value) || !value.every((part) => typeof part === 'string')) return []
  return value.map(normalizeToken).filter(Boolean)
}

function tileTokens(item) {
  if (!Array.isArray(item?.tiles)) return []
  return uniqueTokens(item.tiles)
}

function deterministicOrder(seed, value) {
  return hashString(`${seed}:${normalizeComparable(value)}`)
}

function chooseIntruderIndex(tokens, seed) {
  return tokens
    .map((token, index) => ({ token, index, order: deterministicOrder(seed, `${index}:${token}`) }))
    .filter(({ token }) => Array.from(normalizeComparable(token)).length >= 1)
    .sort((a, b) => a.order - b.order || a.index - b.index)[0]
}

function chooseDistractor(answer, tiles, seed) {
  const answerKeys = new Set(answer.map(normalizeComparable))
  return tiles
    .filter((tile) => !answerKeys.has(normalizeComparable(tile)))
    .sort((a, b) => deterministicOrder(seed, a) - deterministicOrder(seed, b) || a.localeCompare(b))[0]
}

export function errorSpotterSeed({ lesson, session, currentIndex } = {}) {
  return `${lesson?.id ?? 'lesson'}:${session?.id ?? 'session'}:${currentIndex ?? 0}`
}

export function buildErrorSpotterQueue(items = [], context = {}, options = {}) {
  const maxCards = options.maxCards ?? DEFAULT_MAX_CARDS
  const minCards = options.minCards ?? DEFAULT_MIN_CARDS
  const seed = errorSpotterSeed(context)
  const seenAnswers = new Set()

  const cards = items
    .map((item, index) => {
      if (!BUILD_LIKE_TYPES.has(item?.type)) return null
      const correctTokens = answerTokens(item?.answer)
      if (correctTokens.length < 2) return null
      const answerKey = normalizeComparable(correctTokens.join(' '))
      if (!answerKey || seenAnswers.has(answerKey)) return null
      const tiles = tileTokens(item)
      const cardSeed = `${seed}:${item?.id ?? index}`
      const intruder = chooseDistractor(correctTokens, tiles, cardSeed)
      const replaced = chooseIntruderIndex(correctTokens, cardSeed)
      if (!intruder || !replaced) return null

      seenAnswers.add(answerKey)
      const spottedTokens = [...correctTokens]
      spottedTokens[replaced.index] = intruder
      return {
        id: item?.id ?? `error-spotter-${index}`,
        prompt: String(item?.prompt ?? '').trim().replace(/\s+/g, ' '),
        correctTokens,
        spottedTokens,
        intruder,
        intruderIndex: replaced.index,
        correctToken: replaced.token,
        correctText: correctTokens.join(' '),
        seed: cardSeed,
        order: hashString(`${cardSeed}:${answerKey}:${normalizeComparable(intruder)}`),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)))
    .slice(0, maxCards)

  if (cards.length < minCards) return []

  const rotateBy = cards.length ? Math.abs(Number(context.currentIndex) || 0) % cards.length : 0
  return cards
    .slice(rotateBy)
    .concat(cards.slice(0, rotateBy))
    .map(({ order, ...card }) => card)
}

export function validateErrorSpotterSelection(selection, card) {
  const intruder = card?.intruder ?? ''
  const correctToken = card?.correctToken ?? ''
  const correctText = card?.correctText ?? ''
  return {
    status: normalizeComparable(selection) === normalizeComparable(intruder) ? 'correct' : 'wrong',
    intruder,
    correctToken,
    correctText,
  }
}
