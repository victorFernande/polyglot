import { parseMicroDialoguePrompt } from './microDialoguePrompt.mjs'

const DEFAULT_MAX_CARDS = 8

function rawAnswerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  return answer
}

function optionValue(option) {
  if (option && typeof option === 'object' && 'value' in option) return option.value
  return option
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

function shuffleOptions(options, seed) {
  const shuffled = [...options]
  let state = hashString(seed)
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const [nextState, random] = nextRandom(state)
    state = nextState
    const swapIndex = Math.floor(random * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  if (shuffled.length > 1) {
    const offset = hashString(`${seed}:rotate`) % shuffled.length
    return [...shuffled.slice(offset), ...shuffled.slice(0, offset)]
  }
  return shuffled
}

function dialogueReactionSeed({ lesson, session, currentIndex } = {}) {
  return `${lesson?.id ?? lesson?.slug ?? 'lesson'}:${session?.id ?? session?.session_number ?? 'session'}:${currentIndex ?? 0}`
}

export function normalizeDialogueReactionAnswer(value) {
  return String(value ?? '')
    .normalize('NFC')
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export function validateDialogueReactionSelection(selection, card) {
  const expected = String(card?.answer ?? '').trim().normalize('NFC')
  return {
    status: normalizeDialogueReactionAnswer(selection) === normalizeDialogueReactionAnswer(expected) ? 'correct' : 'wrong',
    expected,
  }
}

export function buildDialogueReactionQueue(items = [], context = {}, options = {}) {
  const maxCards = options.maxCards ?? DEFAULT_MAX_CARDS
  const seed = dialogueReactionSeed(context)
  const cards = []

  items.forEach((item, index) => {
    if (item?.type !== 'context_choice') return
    const dialogue = parseMicroDialoguePrompt(item.prompt)
    const answer = rawAnswerValue(item.answer)
    const rawOptions = Array.isArray(item.options) ? item.options : []
    if (!dialogue || typeof answer !== 'string' || rawOptions.length < 2) return

    const cardSeed = `${seed}:${item?.id ?? index}`
    cards.push({
      id: item?.id ?? `dialogue-reaction-${index}`,
      seed: cardSeed,
      instruction: dialogue.instruction,
      partnerLabel: dialogue.partnerLabel,
      partnerText: dialogue.partnerText,
      learnerLabel: dialogue.learnerLabel,
      learnerText: dialogue.learnerText,
      answer: answer.trim().normalize('NFC'),
      options: shuffleOptions(rawOptions.map(optionValue).map((value) => String(value ?? '').trim()).filter(Boolean), cardSeed),
      explanation: item.explanation || item.hint || 'A melhor resposta encaixa no contexto da fala anterior.',
    })
  })

  return cards.slice(0, maxCards)
}
