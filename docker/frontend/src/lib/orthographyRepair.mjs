const DEFAULT_MIN_ANSWER_CHARS = 3
const DEFAULT_MAX_ANSWER_CHARS = 72
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

function orthographyRepairSeed({ lesson, session, currentIndex } = {}) {
  return `${lesson?.id ?? 'lesson'}:${session?.id ?? 'session'}:${currentIndex ?? 0}`
}

export function normalizeOrthographyRepairExact(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeOrthographyRepairWords(value) {
  return normalizeOrthographyRepairExact(value)
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function damageOrthographyRepairText(value) {
  return normalizeOrthographyRepairExact(value)
    .toLocaleLowerCase()
    .replace(/[.!?。！？]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function validateOrthographyRepairAnswer(input, expectedAnswer) {
  const expected = normalizeOrthographyRepairExact(expectedAnswer)
  const exactInput = normalizeOrthographyRepairExact(input)
  if (exactInput === expected) return { status: 'correct', expected }

  const inputWords = normalizeOrthographyRepairWords(input)
  const expectedWords = normalizeOrthographyRepairWords(expected)
  return {
    status: inputWords && inputWords === expectedWords ? 'close' : 'wrong',
    expected,
  }
}

export function buildOrthographyRepairQueue(items = [], context = {}, options = {}) {
  const minAnswerChars = options.minAnswerChars ?? DEFAULT_MIN_ANSWER_CHARS
  const maxAnswerChars = options.maxAnswerChars ?? DEFAULT_MAX_ANSWER_CHARS
  const maxCards = options.maxCards ?? DEFAULT_MAX_CARDS
  const seed = orthographyRepairSeed(context)
  const cards = items
    .map((item, index) => {
      const answer = answerText(item?.answer)
      return {
        id: item?.id ?? `orthography-repair-${index}`,
        prompt: String(item?.prompt ?? 'Repare a frase.').trim().replace(/\s+/g, ' '),
        answer,
        damaged: damageOrthographyRepairText(answer),
        seed: `${seed}:${item?.id ?? index}`,
      }
    })
    .filter((card) => (
      card.answer.length >= minAnswerChars
      && card.answer.length <= maxAnswerChars
      && card.damaged.length >= minAnswerChars
      && card.damaged !== card.answer
      && normalizeOrthographyRepairWords(card.answer).split(' ').length <= 8
    ))
    .slice(0, maxCards)

  const rotateBy = cards.length ? Math.abs(Number(context.currentIndex) || 0) % cards.length : 0
  return cards.slice(rotateBy).concat(cards.slice(0, rotateBy))
}
