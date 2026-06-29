const BUILD_LIKE_TYPES = new Set(['build', 'listen_build'])
const MIN_WORD_LENGTH = 3

function answerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  return answer
}

export function letterScrambleAnswer(letters) {
  return Array.isArray(letters) ? letters.join('') : ''
}

export function buildLetterScramblePayload(letters) {
  return [letterScrambleAnswer(letters)]
}

export function singleWordBuildAnswer(item) {
  const value = answerValue(item?.answer)
  if (!Array.isArray(value) || value.length !== 1 || typeof value[0] !== 'string') return null
  return value[0]
}

export function isLetterScrambleEligible(item) {
  if (!item || !BUILD_LIKE_TYPES.has(item.type)) return false
  const word = singleWordBuildAnswer(item)
  if (!word) return false
  return word.length >= MIN_WORD_LENGTH && !/\s/.test(word)
}

function hashSeed(seed) {
  let hash = 2166136261
  for (const char of String(seed || '')) {
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

export function stableScrambleLetters(word, seed = '') {
  const original = Array.from(String(word || ''))
  const letters = [...original]
  let state = hashSeed(`${seed}:${word}`)
  for (let index = letters.length - 1; index > 0; index -= 1) {
    const result = nextRandom(state)
    state = result[0]
    const swapIndex = Math.floor(result[1] * (index + 1))
    ;[letters[index], letters[swapIndex]] = [letters[swapIndex], letters[index]]
  }
  if (letters.length > 1 && sameOrder(letters, original)) {
    ;[letters[0], letters[letters.length - 1]] = [letters[letters.length - 1], letters[0]]
  }
  return letters
}
