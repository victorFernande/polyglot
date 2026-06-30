const DEFAULT_MAX_CARDS = 8
const DEFAULT_MAX_GRID_OPTIONS = 9
const DEFAULT_MIN_GRID_OPTIONS = 6
const DEFAULT_MAX_PHRASE_CHARS = 80

function rawAnswerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  return answer
}

function normalizePhrase(text) {
  return String(text ?? '').trim().replace(/\s+/g, ' ')
}

function comparablePhrase(text) {
  return normalizePhrase(text).normalize('NFC').toLocaleLowerCase()
}

function hashString(text) {
  let hash = 2166136261
  for (const char of String(text)) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function audioBingoSeed({ lesson, session, currentIndex } = {}) {
  return `${lesson?.id ?? 'lesson'}:${session?.id ?? 'session'}:${currentIndex ?? 0}`
}

function answerPhrases(answer) {
  const value = rawAnswerValue(answer)
  if (typeof value === 'string') return [normalizePhrase(value)]
  if (Array.isArray(value) && value.every((part) => typeof part === 'string')) {
    const normalizedParts = value.map(normalizePhrase).filter(Boolean)
    if (!normalizedParts.length) return []
    const joined = normalizePhrase(normalizedParts.join(' '))
    const shouldUseSequence = normalizedParts.length >= 3 && normalizedParts.some((part) => /[.!?？！。]$/u.test(part))
    return shouldUseSequence ? normalizedParts : [joined]
  }
  return []
}

export function extractAudioBingoPhrases(items = [], options = {}) {
  const maxPhraseChars = options.maxPhraseChars ?? DEFAULT_MAX_PHRASE_CHARS
  const seen = new Set()
  const phrases = []

  for (const item of items) {
    for (const phrase of answerPhrases(item?.answer)) {
      const normalized = normalizePhrase(phrase)
      const key = comparablePhrase(normalized)
      if (!key || normalized.length > maxPhraseChars || seen.has(key)) continue
      seen.add(key)
      phrases.push(normalized)
    }
  }

  return phrases
}

function orderedOptionsForTarget(targetIndex, phrases, seed, maxGridOptions) {
  const selectedEntries = phrases
    .map((phrase, index) => ({
      phrase,
      index,
      order: index === targetIndex ? -1 : hashString(`${seed}:grid:${targetIndex}:${index}:${phrase}`),
    }))
    .sort((a, b) => a.order - b.order || a.phrase.localeCompare(b.phrase))
    .slice(0, maxGridOptions)

  return selectedEntries
    .map(({ phrase, index }) => ({
      key: index === targetIndex ? `target-${targetIndex}` : `option-${index}`,
      text: phrase,
      order: hashString(`${seed}:cell:${targetIndex}:${index}:${phrase}`),
    }))
    .sort((a, b) => a.order - b.order || a.text.localeCompare(b.text))
    .map(({ order, ...option }) => option)
}

export function buildAudioBingoQueue(items = [], context = {}, options = {}) {
  const maxCards = options.maxCards ?? DEFAULT_MAX_CARDS
  const maxGridOptions = options.maxGridOptions ?? DEFAULT_MAX_GRID_OPTIONS
  const minGridOptions = options.minGridOptions ?? DEFAULT_MIN_GRID_OPTIONS
  const seed = audioBingoSeed(context)
  const phrases = extractAudioBingoPhrases(items, options)
  if (phrases.length < minGridOptions) return []

  const cards = phrases
    .map((targetText, index) => ({
      id: `audio-bingo-${index}`,
      targetText,
      targetKey: `target-${index}`,
      grid: orderedOptionsForTarget(index, phrases, seed, maxGridOptions),
      seed: `${seed}:${index}:${targetText}`,
      order: hashString(`${seed}:card:${index}:${targetText}`),
    }))
    .sort((a, b) => a.order - b.order || a.targetText.localeCompare(b.targetText))
    .slice(0, maxCards)

  const rotateBy = cards.length ? Math.abs(Number(context.currentIndex) || 0) % cards.length : 0
  return cards
    .slice(rotateBy)
    .concat(cards.slice(0, rotateBy))
    .map(({ order, ...card }) => card)
}

export function validateAudioBingoSelection(selectionKey, card) {
  const selected = card?.grid?.find((option) => option.key === selectionKey)?.text || ''
  const expected = card?.targetText || ''
  return {
    status: selected && comparablePhrase(selected) === comparablePhrase(expected) ? 'correct' : 'wrong',
    expected,
    selected,
  }
}
