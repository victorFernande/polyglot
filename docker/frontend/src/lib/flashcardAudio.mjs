export function hasFlashcardAudio(card) {
  return Boolean(String(card?.audio_text || '').trim() && card?.audio_lang)
}

export function audioSegmentsForFlashcard(card) {
  if (!hasFlashcardAudio(card)) return []
  return [{ text: String(card.audio_text).trim(), lang: card.audio_lang }].filter((segment) => segment.text)
}
