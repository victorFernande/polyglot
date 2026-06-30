const DEFAULT_MAX_ANSWER_CHARS = 48
const DEFAULT_MAX_CARDS = 8

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

function typingRushSeed({ lesson, session, currentIndex } = {}) {
  return `${lesson?.id ?? 'lesson'}:${session?.id ?? 'session'}:${currentIndex ?? 0}`
}

export function normalizeTypingRushAnswer(value) {
  return String(value ?? '')
    .normalize('NFC')
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function editDistance(a, b) {
  const left = Array.from(a)
  const right = Array.from(b)
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i += 1) {
    let lastDiagonal = previous[0]
    previous[0] = i
    for (let j = 1; j <= right.length; j += 1) {
      const old = previous[j]
      previous[j] = left[i - 1] === right[j - 1]
        ? lastDiagonal
        : Math.min(previous[j] + 1, previous[j - 1] + 1, lastDiagonal + 1)
      lastDiagonal = old
    }
  }
  return previous[right.length]
}

export function validateTypingRushAnswer(input, expectedAnswer) {
  const expected = String(expectedAnswer ?? '').trim().replace(/\s+/g, ' ')
  const normalizedInput = normalizeTypingRushAnswer(input)
  const normalizedExpected = normalizeTypingRushAnswer(expected)
  if (normalizedInput === normalizedExpected) return { status: 'correct', expected }
  const distance = editDistance(normalizedInput, normalizedExpected)
  const closeThreshold = normalizedExpected.length <= 5 ? 1 : 2
  return { status: distance <= closeThreshold ? 'close' : 'wrong', expected }
}

export function typingRushPrompt(prompt, answer) {
  const text = String(prompt ?? '').trim().replace(/\s+/g, ' ')
  const normalizedAnswer = normalizeTypingRushAnswer(answer)
  return text.replace(/\s*\(([^()]*)\)\s*$/u, (match, inner) => (
    normalizeTypingRushAnswer(inner) === normalizedAnswer ? '' : match.trimEnd()
  ))
}

export function buildTypingRushQueue(items = [], context = {}, options = {}) {
  const maxAnswerChars = options.maxAnswerChars ?? DEFAULT_MAX_ANSWER_CHARS
  const maxCards = options.maxCards ?? DEFAULT_MAX_CARDS
  const seed = typingRushSeed(context)
  const cards = items
    .map((item, index) => {
      const answer = answerText(item?.answer)
      return {
        id: item?.id ?? `typing-rush-${index}`,
        prompt: typingRushPrompt(item?.prompt, answer),
        answer,
        seed: `${seed}:${item?.id ?? index}`,
        order: hashString(`${seed}:${item?.id ?? index}:${answer}`),
      }
    })
    .filter((card) => card.answer.length > 0 && card.answer.length <= maxAnswerChars && card.prompt.length > 0)
    .sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)))
    .slice(0, maxCards)

  const rotateBy = cards.length ? Math.abs(Number(context.currentIndex) || 0) % cards.length : 0
  return cards
    .slice(rotateBy)
    .concat(cards.slice(0, rotateBy))
    .map(({ order, ...card }) => card)
}
