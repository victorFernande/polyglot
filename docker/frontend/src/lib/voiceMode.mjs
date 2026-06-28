export function voiceTextForItem(item) {
  return item?.prompt || ''
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
