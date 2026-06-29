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

export function speechLangForLanguage(languageCode) {
  return SPEECH_LANG[languageCode] || languageCode || 'pt-BR'
}

function compactSegments(segments) {
  const out = []
  for (const segment of segments) {
    const text = cleanText(segment.text)
    if (!text) continue
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
  const targetLang = speechLangForLanguage(languageCode)
  const targetAnswer = readableAnswer(item.answer)
  const segments = []
  let prompt = item.prompt

  const parentheticalTarget = targetAnswer ? `(${targetAnswer})` : ''
  if (parentheticalTarget && prompt.includes(parentheticalTarget)) {
    prompt = prompt.replace(parentheticalTarget, '')
    segments.push({ text: prompt, lang: 'pt-BR' })
    segments.push({ text: targetAnswer, lang: targetLang })
    return compactSegments(segments)
  }

  segments.push({ text: prompt, lang: 'pt-BR' })
  if (targetAnswer && !prompt.includes(targetAnswer)) {
    segments.push({ text: `Resposta em ${LANGUAGE_NAMES[languageCode] || 'idioma estudado'}:`, lang: 'pt-BR' })
    segments.push({ text: targetAnswer, lang: targetLang })
  }
  return compactSegments(segments)
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

export function voiceSegmentsForFeedback(feedback, languageCode = 'pt') {
  if (!feedback) return []
  const targetLang = speechLangForLanguage(languageCode)
  const correct = readableAnswer(feedback.correctAnswer || feedback.correct_answer || feedback.mistake?.correct_answer)
  if (feedback.type === 'correct') {
    const explanation = feedback.explanation || ''
    if (correct && explanation.includes(correct)) {
      const prefix = explanation.replace(correct, '').replace(/\s+\./g, '.').replace(/:\s*\./g, ':').trim() || 'Resposta correta:'
      return compactSegments([
        { text: `Correto. ${prefix}`, lang: 'pt-BR' },
        { text: correct, lang: targetLang },
      ])
    }
    return compactSegments([{ text: 'Correto.', lang: 'pt-BR' }, { text: explanation, lang: 'pt-BR' }])
  }
  if (feedback.type === 'wrong') {
    return compactSegments([
      { text: 'Marcado como erro.', lang: 'pt-BR' },
      { text: feedback.mistake?.message || '', lang: 'pt-BR' },
      correct ? { text: correct, lang: targetLang } : null,
      { text: feedback.explanation || '', lang: 'pt-BR' },
    ].filter(Boolean))
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
