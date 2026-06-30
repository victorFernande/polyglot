function hashString(value) {
  const text = String(value ?? '')
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function answerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  return answer
}

function normalizeWord(value) {
  if (Array.isArray(value)) {
    if (value.length !== 1) return null
    return normalizeWord(value[0])
  }
  if (value == null || typeof value === 'object') return null
  const word = String(value).trim().toLocaleUpperCase()
  if (!word || /\s/u.test(word)) return null
  const letters = Array.from(word)
  const hasCompactScript = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(word)
  if (letters.length < 3 && !hasCompactScript) return null
  if (letters.length > 8) return null
  return word
}

function stableSortWords(words, seed) {
  return [...words].sort((left, right) => {
    const leftHash = hashString(`${seed}:${left}`)
    const rightHash = hashString(`${seed}:${right}`)
    return leftHash - rightHash || left.localeCompare(right)
  })
}

function serpentineCells(size) {
  const cells = []
  for (let row = 0; row < size; row += 1) {
    const cols = Array.from({ length: size }, (_, col) => col)
    if (row % 2 === 1) cols.reverse()
    for (const col of cols) cells.push({ row, col })
  }
  return cells
}

function pointKey(point) {
  return `${point.row}:${point.col}`
}

function letterAt(grid, point) {
  return grid?.[point?.row]?.[point?.col]
}

const FILLER = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ')

export function eligibleLetterBlockWords(items = [], limit = 8) {
  const seen = new Set()
  const words = []
  for (const item of items) {
    const word = normalizeWord(answerValue(item?.answer))
    if (!word || seen.has(word)) continue
    seen.add(word)
    words.push(word)
    if (words.length >= limit) break
  }
  return words
}

export function generateLetterBlocksPuzzle(words = [], seed = '', requestedSize = 5) {
  const normalizedWords = words.map(normalizeWord).filter(Boolean)
  const orderedWords = stableSortWords(normalizedWords, seed)
  const totalLetters = orderedWords.reduce((sum, word) => sum + Array.from(word).length, 0)
  const longest = orderedWords.reduce((max, word) => Math.max(max, Array.from(word).length), 0)
  const size = Math.max(requestedSize, Math.ceil(Math.sqrt(Math.max(totalLetters, 1))), Math.min(longest, 5), 4)
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => null))
  const cells = serpentineCells(size)
  const paths = {}
  const targets = []
  let cursor = 0

  for (const word of orderedWords) {
    const letters = Array.from(word)
    if (cursor + letters.length > cells.length) break
    const path = cells.slice(cursor, cursor + letters.length)
    path.forEach((point, index) => {
      grid[point.row][point.col] = letters[index]
    })
    paths[word] = path
    targets.push(word)
    cursor += letters.length
  }

  const filledGrid = grid.map((row, rowIndex) => row.map((letter, colIndex) => letter || FILLER[hashString(`${seed}:${rowIndex}:${colIndex}`) % FILLER.length]))
  return { grid: filledGrid, targets, paths }
}

export function validateLetterBlocksPath({ grid = [], targets = [], path = [] } = {}) {
  if (!Array.isArray(path) || path.length === 0) return { found: false, word: null, reason: 'empty' }

  const seen = new Set()
  for (const point of path) {
    const key = pointKey(point)
    if (seen.has(key)) return { found: false, word: null, reason: 'reused-cell' }
    seen.add(key)
  }

  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1]
    const current = path[index]
    const distance = Math.abs(current.row - previous.row) + Math.abs(current.col - previous.col)
    if (distance !== 1) return { found: false, word: null, reason: 'not-adjacent' }
  }

  const word = path.map((point) => letterAt(grid, point)).join('')
  if (targets.includes(word)) return { found: true, word }
  return { found: false, word: null, reason: 'not-target' }
}

export function updateFoundLetterBlockWords(foundWords = [], result = {}) {
  if (!result.found || !result.word || foundWords.includes(result.word)) return foundWords
  return [...foundWords, result.word]
}

export function letterBlocksSeed({ lesson, session, currentIndex = 0 } = {}) {
  const lessonKey = lesson?.id ?? lesson?.slug ?? 'lesson'
  const sessionKey = session?.id ?? session?.session_number ?? 'session'
  return `${lessonKey}:${sessionKey}:${currentIndex}`
}
