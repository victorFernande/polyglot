const SPEECH_LANG = { de: 'de-DE', fr: 'fr-FR', ru: 'ru-RU', jp: 'ja-JP', en: 'en-US', pt: 'pt-BR' }
const LANGUAGE_NAMES = { de: 'alemão', fr: 'francês', ru: 'russo', jp: 'japonês', en: 'inglês' }

function answerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  if (answer && typeof answer === 'object' && 'pairs' in answer) return answer.pairs
  return answer
}

function readableAnswer(value) {
  if (value == null) return ''
  if (Array.isArray(value)) {
    if (Array.isArray(value[0])) return value.map(([left, right]) => `${left} = ${right}`).join('; ')
    return value.join(' ')
  }
  if (typeof value === 'object') return readableAnswer(answerValue(value))
  return String(value)
}

function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

function stripLearningPathPrefix(text) {
  let out = cleanText(text)
  // Drop verbose progress/navigation labels from spoken questions. Keep only the
  // action the learner needs to hear, e.g. "como dizer..." or "escolha...".
  out = out.replace(/^Unidade\s+\d+\/\d+\s+—\s+.*?:\s*/i, '')
  out = out.replace(/^Tópico\s+\d+\/\d+\s+—\s+.*?:\s*/i, '')
  return cleanText(out)
}

export function speechLangForLanguage(languageCode) {
  return SPEECH_LANG[languageCode] || languageCode || 'pt-BR'
}

function compactSegments(segments) {
  const out = []
  for (const segment of segments) {
    const text = cleanText(segment.text)
    if (!text || /^[.!?,;:]+$/.test(text)) continue
    const lang = segment.lang || 'pt-BR'
    const last = out[out.length - 1]
    if (last && last.lang === lang) last.text = cleanText(`${last.text} ${text}`)
    else out.push({ text, lang })
  }
  return out
}

export function voiceTextForItem(item) {
  return item?.prompt || ''
}

export function voiceSegmentsForItem(item, languageCode = 'pt') {
  if (!item?.prompt) return []
  const targetAnswer = readableAnswer(item.answer)
  let prompt = item.prompt

  // The question audio must never reveal the answer before the learner responds.
  // Some prompts include the target-language phrase in parentheses for visual/image
  // context; keep that visible on screen, but remove it from pre-answer audio.
  const parentheticalTarget = targetAnswer ? `(${targetAnswer})` : ''
  if (parentheticalTarget && prompt.includes(parentheticalTarget)) {
    prompt = prompt.replace(parentheticalTarget, '')
  }

  return compactSegments([{ text: stripLearningPathPrefix(prompt), lang: 'pt-BR' }])
}

function segmentsReplacingCorrectAnswer(text, correct, targetLang) {
  const clean = cleanText(text)
  if (!clean || !correct || !clean.includes(correct)) {
    return clean ? [{ text: clean, lang: 'pt-BR' }] : []
  }
  const [before, ...afterParts] = clean.split(correct)
  const after = afterParts.join(correct).replace(/^\s*[.!?,;:]+\s*/, '')
  return compactSegments([
    { text: before, lang: 'pt-BR' },
    { text: correct, lang: targetLang },
    { text: after, lang: 'pt-BR' },
  ])
}

export function voiceTextForFeedback(feedback) {
  if (!feedback) return ''
  if (feedback.type === 'correct') {
    return ['Correto.', feedback.explanation].filter(Boolean).join(' ')
  }
  if (feedback.type === 'wrong') {
    return ['Marcado como erro.', feedback.mistake?.message, feedback.explanation].filter(Boolean).join(' ')
  }
  return feedback.explanation || ''
}

function correctAnswerFromFeedback(feedback) {
  return readableAnswer(feedback?.correctAnswer || feedback?.correct_answer || feedback?.mistake?.correct_answer)
}

export function voiceSegmentsForAnswerOnly(feedback, languageCode = 'pt') {
  const correct = correctAnswerFromFeedback(feedback)
  return compactSegments([
    correct ? { text: correct, lang: speechLangForLanguage(languageCode) } : null,
  ].filter(Boolean))
}

export function voiceSegmentsForFeedback(feedback, languageCode = 'pt') {
  if (!feedback) return []
  const correctSegments = voiceSegmentsForAnswerOnly(feedback, languageCode)

  // Spoken feedback should be short. The visual card may keep the full
  // explanation, but audio should only reinforce the result and the phrase.
  if (feedback.type === 'correct') {
    return compactSegments([
      { text: 'Correto.', lang: 'pt-BR' },
      ...correctSegments,
    ])
  }
  if (feedback.type === 'wrong') {
    return compactSegments([
      { text: 'Resposta correta:', lang: 'pt-BR' },
      ...correctSegments,
    ])
  }
  return compactSegments([{ text: feedback.explanation || '', lang: 'pt-BR' }])
}

export function canUseSpeechSynthesis(win = globalThis.window) {
  return !!(win && 'speechSynthesis' in win && 'SpeechSynthesisUtterance' in win)
}

export function speak(text, langCode = 'pt-BR', win = globalThis.window) {
  if (!text || !canUseSpeechSynthesis(win)) return false
  win.speechSynthesis.cancel()
  const utterance = new win.SpeechSynthesisUtterance(text)
  utterance.lang = langCode
  utterance.rate = 0.9
  win.speechSynthesis.speak(utterance)
  return true
}

export function speakSegmentsWithBrowser(segments, win = globalThis.window) {
  if (!segments?.length || !canUseSpeechSynthesis(win)) return false
  win.speechSynthesis.cancel()
  for (const segment of compactSegments(segments)) {
    const utterance = new win.SpeechSynthesisUtterance(segment.text)
    utterance.lang = segment.lang
    utterance.rate = 0.9
    win.speechSynthesis.speak(utterance)
  }
  return true
}
