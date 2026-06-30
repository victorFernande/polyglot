const MIN_ARTICLE_SORTER_CARDS = 4
const DEFAULT_MAX_CARDS = 6
const DEFAULT_MAX_NOUN_WORDS = 3

export const ARTICLE_SORTER_BUCKETS = ['der', 'die', 'das']

function rawAnswerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  return answer
}

function answerText(answer) {
  const value = rawAnswerValue(answer)
  if (typeof value === 'string') return value.trim().replace(/\s+/g, ' ')
  if (Array.isArray(value) && value.every((part) => typeof part === 'string')) return value.join(' ').trim().replace(/\s+/g, ' ')
  return ''
}

function hashString(text) {
  let hash = 2166136261
  for (const char of String(text)) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function articleSorterSeed({ lesson, session, currentIndex } = {}) {
  return `${lesson?.id ?? 'lesson'}:${session?.id ?? 'session'}:${currentIndex ?? 0}`
}

function languageCode(lesson) {
  return String(lesson?.language_code || lesson?.language || '').trim().toLocaleLowerCase()
}

function normalizeGermanArticle(value) {
  const normalized = String(value ?? '').trim().toLocaleLowerCase()
  return ARTICLE_SORTER_BUCKETS.includes(normalized) ? normalized : ''
}

function extractSorterCard(item, index, context, options) {
  const text = answerText(item?.answer)
  const match = /^(der|die|das)\s+(.+)$/iu.exec(text)
  if (!match) return null

  const article = normalizeGermanArticle(match[1])
  const noun = match[2].trim().replace(/\s+/g, ' ')
  if (!article || !noun) return null

  const nounWords = noun.split(/\s+/u)
  if (nounWords.length > (options.maxNounWords ?? DEFAULT_MAX_NOUN_WORDS)) return null

  const seed = `${articleSorterSeed(context)}:${item?.id ?? index}`
  return {
    id: item?.id ?? `article-sorter-${index}`,
    prompt: String(item?.prompt ?? '').trim().replace(/\s+/g, ' '),
    article,
    noun,
    fullAnswer: `${article} ${noun}`,
    seed,
    order: hashString(`${seed}:${article}:${noun}`),
  }
}

export function buildArticleSorterRound(items = [], context = {}, options = {}) {
  if (languageCode(context.lesson) !== 'de') return { buckets: ARTICLE_SORTER_BUCKETS, cards: [] }

  const seen = new Set()
  const cards = []
  for (const [index, item] of items.entries()) {
    const card = extractSorterCard(item, index, context, options)
    if (!card) continue
    const duplicateKey = `${card.article}:${card.noun.toLocaleLowerCase()}`
    if (seen.has(duplicateKey)) continue
    seen.add(duplicateKey)
    cards.push(card)
  }

  if (cards.length < (options.minCards ?? MIN_ARTICLE_SORTER_CARDS)) return { buckets: ARTICLE_SORTER_BUCKETS, cards: [] }

  const maxCards = options.maxCards ?? DEFAULT_MAX_CARDS
  const sorted = cards
    .sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)))
    .slice(0, maxCards)
  const rotateBy = sorted.length ? Math.abs(Number(context.currentIndex) || 0) % sorted.length : 0
  const rotated = sorted.slice(rotateBy).concat(sorted.slice(0, rotateBy)).map(({ order, ...card }) => card)

  return { buckets: ARTICLE_SORTER_BUCKETS, cards: rotated }
}

export function validateArticleSorterBuckets(assignments = {}, cards = []) {
  const items = cards.map((card) => {
    const selected = normalizeGermanArticle(assignments[card.id])
    const expected = normalizeGermanArticle(card.article)
    const status = selected && selected === expected ? 'correct' : 'wrong'
    const fullAnswer = card.fullAnswer ?? `${expected} ${card.noun}`
    return {
      id: card.id,
      noun: card.noun,
      selected,
      expected,
      fullAnswer,
      status,
      feedback: status === 'correct' ? 'Correto.' : `Resposta esperada: ${fullAnswer}`,
    }
  })
  const correct = items.filter((item) => item.status === 'correct').length
  return {
    total: items.length,
    correct,
    status: correct === items.length && items.length > 0 ? 'correct' : 'partial',
    items,
  }
}
