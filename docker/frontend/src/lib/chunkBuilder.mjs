const DEFAULT_MAX_CARDS = 6
const MIN_WORDS = 3
const MAX_WORDS = 12

function rawAnswerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  return answer
}

function phraseAnswer(answer) {
  const value = rawAnswerValue(answer)
  if (Array.isArray(value)) return value.map((part) => String(part ?? '').trim()).filter(Boolean).join(' ')
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/gu, ' ').normalize('NFC')
}

function wordsForPhrase(phrase) {
  return String(phrase ?? '').trim().split(/\s+/u).filter(Boolean)
}

function hashString(text) {
  let hash = 2166136261
  for (const char of String(text ?? '')) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function nextRandom(state) {
  let value = state >>> 0
  value += 0x6D2B79F5
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  const next = (value ^ (value >>> 14)) >>> 0
  return [next, next / 4294967296]
}

function sameOrder(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function shuffleChunks(chunks, seed) {
  const shuffled = [...chunks]
  let state = hashString(`${seed}:${chunks.join('|')}`)
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const [nextState, random] = nextRandom(state)
    state = nextState
    const swapIndex = Math.floor(random * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  if (shuffled.length > 1 && sameOrder(shuffled, chunks)) {
    ;[shuffled[0], shuffled[shuffled.length - 1]] = [shuffled[shuffled.length - 1], shuffled[0]]
  }
  return shuffled
}

function chunkBuilderSeed({ lesson, session, currentIndex } = {}) {
  return `${lesson?.id ?? lesson?.slug ?? 'lesson'}:${session?.id ?? session?.session_number ?? 'session'}:${currentIndex ?? 0}`
}

export function chunksToText(chunks = []) {
  return (Array.isArray(chunks) ? chunks : [])
    .map((chunk) => String(chunk ?? '').trim().replace(/\s+/gu, ' '))
    .filter(Boolean)
    .join(' ')
}

export function splitPhraseIntoChunks(phrase) {
  const words = wordsForPhrase(phrase)
  if (words.length < MIN_WORDS || words.length > MAX_WORDS) return []
  if (words.length <= 4) return [words.slice(0, 2).join(' '), words.slice(2).join(' ')].filter(Boolean)

  const chunks = []
  for (let index = 0; index < words.length; index += 2) {
    chunks.push(words.slice(index, index + 2).join(' '))
  }
  return chunks.filter(Boolean)
}

export function buildChunkBuilderQueue(items = [], context = {}, options = {}) {
  const maxCards = options.maxCards ?? DEFAULT_MAX_CARDS
  const seed = chunkBuilderSeed(context)
  const seen = new Set()
  const cards = []

  items.forEach((item, index) => {
    const answer = phraseAnswer(item?.answer)
    const normalized = answer.toLocaleLowerCase()
    if (!answer || seen.has(normalized)) return
    const chunks = splitPhraseIntoChunks(answer)
    if (chunks.length < 2) return
    seen.add(normalized)
    const cardSeed = `${seed}:${item?.id ?? index}`
    cards.push({
      id: item?.id ?? `chunk-builder-${index}`,
      prompt: String(item?.prompt ?? '').trim().replace(/\s+/gu, ' '),
      answer: chunksToText(chunks),
      chunks,
      shuffledChunks: shuffleChunks(chunks, cardSeed),
      seed: cardSeed,
    })
  })

  return cards.slice(0, maxCards)
}

export function chunkBuilderCanSubmit(selectedChunks = [], expectedChunks = []) {
  return Array.isArray(selectedChunks) && Array.isArray(expectedChunks) && selectedChunks.length === expectedChunks.length
}

export function validateChunkBuilderAnswer(selectedChunks = [], expectedChunks = []) {
  const selected = chunksToText(selectedChunks)
  const expected = chunksToText(expectedChunks)
  return {
    status: selected === expected ? 'correct' : 'wrong',
    expected,
  }
}
