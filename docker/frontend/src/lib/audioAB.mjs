const DEFAULT_MAX_CARDS = 8
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

function audioABSeed({ lesson, session, currentIndex } = {}) {
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

export function extractAudioABPhrases(items = [], options = {}) {
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

function chooseDistractor(targetIndex, phrases, seed) {
  return phrases
    .map((phrase, index) => ({ phrase, index, order: hashString(`${seed}:distractor:${targetIndex}:${index}:${phrase}`) }))
    .filter((entry) => entry.index !== targetIndex)
    .sort((a, b) => a.order - b.order || a.phrase.localeCompare(b.phrase))[0]
}

function optionOrder(seed, phrase) {
  return hashString(`${seed}:option:${phrase}`)
}

export function buildAudioABQueue(items = [], context = {}, options = {}) {
  const maxCards = options.maxCards ?? DEFAULT_MAX_CARDS
  const seed = audioABSeed(context)
  const phrases = extractAudioABPhrases(items, options)
  if (phrases.length < 4) return []

  const cards = phrases
    .map((targetText, index) => {
      const distractor = chooseDistractor(index, phrases, seed)
      if (!distractor) return null
      const targetKey = `target-${index}`
      const distractorKey = `distractor-${distractor.index}`
      const optionsForCard = [
        { key: targetKey, text: targetText },
        { key: distractorKey, text: distractor.phrase },
      ].sort((a, b) => optionOrder(`${seed}:${index}`, a.text) - optionOrder(`${seed}:${index}`, b.text) || a.text.localeCompare(b.text))
      return {
        id: `audio-ab-${index}`,
        targetText,
        targetKey,
        options: optionsForCard,
        seed: `${seed}:${index}:${targetText}`,
        order: hashString(`${seed}:card:${index}:${targetText}`),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order || a.targetText.localeCompare(b.targetText))
    .slice(0, maxCards)

  const rotateBy = cards.length ? Math.abs(Number(context.currentIndex) || 0) % cards.length : 0
  return cards
    .slice(rotateBy)
    .concat(cards.slice(0, rotateBy))
    .map(({ order, ...card }) => card)
}

export function validateAudioABSelection(selectionKey, card) {
  const selected = card?.options?.find((option) => option.key === selectionKey)?.text || ''
  const expected = card?.targetText || ''
  return {
    status: selectionKey && selectionKey === card?.targetKey ? 'correct' : 'wrong',
    expected,
    selected,
  }
}
