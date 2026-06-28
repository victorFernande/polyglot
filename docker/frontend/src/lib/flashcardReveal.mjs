export function getFlashcardSupportVisibility({ flipped }) {
  return {
    hint: Boolean(flipped),
    explanation: Boolean(flipped),
  }
}
