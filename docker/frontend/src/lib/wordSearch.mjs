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
  if (Array.from(word).length < 3 && !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(word)) return null
  return word
}

function stableSortWords(words, seed) {
  return [...words].sort((left, right) => {
    const leftHash = hashString(`${seed}:${left}`)
    const rightHash = hashString(`${seed}:${right}`)
    return leftHash - rightHash || left.localeCompare(right)
  })
}

function cellKey(point) {
  return `${point.row}:${point.col}`
}

function samePoint(left, right) {
  return left?.row === right?.row && left?.col === right?.col
}

const DIRECTIONS = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: -1, col: 0 },
  { row: -1, col: -1 },
  { row: 1, col: -1 },
]

const FILLER = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ')

export function eligibleWordSearchWords(items = [], limit = 8) {
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

function coordinatesFor(word, start, direction) {
  return Array.from(word).map((letter, index) => ({
    letter,
    row: start.row + direction.row * index,
    col: start.col + direction.col * index,
  }))
}

function canPlace(grid, coordinates) {
  const size = grid.length
  return coordinates.every(({ letter, row, col }) => {
    if (row < 0 || col < 0 || row >= size || col >= size) return false
    return grid[row][col] == null || grid[row][col] === letter
  })
}

function placementCandidates(word, size, seed) {
  const candidates = []
  for (const direction of DIRECTIONS) {
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const start = { row, col }
        const coordinates = coordinatesFor(word, start, direction)
        const end = coordinates.at(-1)
        if (end.row >= 0 && end.col >= 0 && end.row < size && end.col < size) {
          candidates.push({ start, end: { row: end.row, col: end.col }, direction, coordinates })
        }
      }
    }
  }
  return candidates.sort((left, right) => hashString(`${seed}:${word}:${cellKey(left.start)}:${cellKey(left.end)}`) - hashString(`${seed}:${word}:${cellKey(right.start)}:${cellKey(right.end)}`))
}

export function generateWordSearchGrid(words = [], seed = '', requestedSize = 10) {
  const normalizedWords = words.map(normalizeWord).filter(Boolean)
  const longest = normalizedWords.reduce((max, word) => Math.max(max, Array.from(word).length), 0)
  const size = Math.max(requestedSize, longest, 6)
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => null))
  const placements = {}

  for (const word of stableSortWords(normalizedWords, seed)) {
    const candidate = placementCandidates(Array.from(word), size, seed).find(({ coordinates }) => canPlace(grid, coordinates))
    if (!candidate) continue
    for (const { letter, row, col } of candidate.coordinates) {
      grid[row][col] = letter
    }
    placements[word] = {
      word,
      start: candidate.start,
      end: candidate.end,
      cells: candidate.coordinates.map(({ row, col }) => ({ row, col })),
    }
  }

  const filledGrid = grid.map((row, rowIndex) => row.map((letter, colIndex) => letter || FILLER[hashString(`${seed}:${rowIndex}:${colIndex}`) % FILLER.length]))
  return { grid: filledGrid, placements }
}

export function validateWordSearchSelection({ placements = {}, from, to } = {}) {
  for (const [word, placement] of Object.entries(placements)) {
    if ((samePoint(from, placement.start) && samePoint(to, placement.end)) || (samePoint(from, placement.end) && samePoint(to, placement.start))) {
      return { found: true, word }
    }
  }
  return { found: false, word: null }
}

export function updateFoundWordSearchWords(foundWords = [], result = {}) {
  if (!result.found || !result.word || foundWords.includes(result.word)) return foundWords
  return [...foundWords, result.word]
}

export function wordSearchSeed({ lesson, session, currentIndex = 0 } = {}) {
  const lessonKey = lesson?.id ?? lesson?.slug ?? 'lesson'
  const sessionKey = session?.id ?? session?.session_number ?? 'session'
  return `${lessonKey}:${sessionKey}:${currentIndex}`
}
