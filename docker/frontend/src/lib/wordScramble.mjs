const DEFAULT_MAX_CARDS = 8
const MIN_LATIN_WORD_LENGTH = 3

function rawAnswerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  return answer
}

function answerWord(answer) {
  const value = rawAnswerValue(answer)
  if (Array.isArray(value)) {
    if (value.length !== 1) return ''
    return answerWord(value[0])
  }
  if (typeof value !== 'string') return ''
  const word = value.trim().normalize('NFC')
  if (!word || /\s/u.test(word)) return ''
  const letters = Array.from(word)
  const hasCompactScript = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(word)
  if (letters.length < MIN_LATIN_WORD_LENGTH && !hasCompactScript) return ''
  return word
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

function scrambleLetters(word, seed) {
  const original = Array.from(word)
  const letters = [...original]
  let state = hashString(`${seed}:${word}`)
  for (let index = letters.length - 1; index > 0; index -= 1) {
    const [nextState, random] = nextRandom(state)
    state = nextState
    const swapIndex = Math.floor(random * (index + 1))
    ;[letters[index], letters[swapIndex]] = [letters[swapIndex], letters[index]]
  }
  if (letters.length > 1 && sameOrder(letters, original) && new Set(letters).size > 1) {
    ;[letters[0], letters[letters.length - 1]] = [letters[letters.length - 1], letters[0]]
  }
  return letters
}

function wordScrambleSeed({ lesson, session, currentIndex } = {}) {
  return `${lesson?.id ?? lesson?.slug ?? 'lesson'}:${session?.id ?? session?.session_number ?? 'session'}:${currentIndex ?? 0}`
}

export function normalizeWordScrambleAnswer(value) {
  return String(value ?? '')
    .normalize('NFC')
    .toLocaleLowerCase()
    .trim()
}

export function validateWordScrambleAnswer(selectedLetters = [], expectedAnswer = '') {
  const selected = Array.isArray(selectedLetters) ? selectedLetters.join('') : String(selectedLetters ?? '')
  const expected = String(expectedAnswer ?? '').trim().normalize('NFC')
  return {
    status: normalizeWordScrambleAnswer(selected) === normalizeWordScrambleAnswer(expected) ? 'correct' : 'wrong',
    expected,
  }
}

export function buildWordScrambleQueue(items = [], context = {}, options = {}) {
  const maxCards = options.maxCards ?? DEFAULT_MAX_CARDS
  const seed = wordScrambleSeed(context)
  const seen = new Set()
  const cards = []

  items.forEach((item, index) => {
    const answer = answerWord(item?.answer)
    const normalized = normalizeWordScrambleAnswer(answer)
    if (!answer || seen.has(normalized)) return
    seen.add(normalized)
    const cardSeed = `${seed}:${item?.id ?? index}`
    cards.push({
      id: item?.id ?? `word-scramble-${index}`,
      prompt: String(item?.prompt ?? '').trim().replace(/\s+/g, ' '),
      answer,
      letters: scrambleLetters(answer, cardSeed),
      seed: cardSeed,
    })
  })

  return cards.slice(0, maxCards)
}
