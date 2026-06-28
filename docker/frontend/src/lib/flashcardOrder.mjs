export function shuffleFlashcards(cards, random = Math.random) {
  const shuffled = [...cards]

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const current = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = current
  }

  return shuffled
}
