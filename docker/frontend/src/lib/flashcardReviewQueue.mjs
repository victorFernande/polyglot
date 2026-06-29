export function getFlashcardReviewKey(card) {
  if (!card) return ''
  return card.id ?? `${card.language ?? ''}|${card.front ?? ''}|${card.back ?? ''}`
}

export function addFlashcardToReviewQueue(queue, card) {
  if (!card) return [...queue]

  const cardKey = getFlashcardReviewKey(card)
  const alreadyQueued = queue.some((queuedCard) => getFlashcardReviewKey(queuedCard) === cardKey)
  if (alreadyQueued) return [...queue]

  return [...queue, card]
}

export function mergeFlashcardsWithReviewQueue(cards, reviewQueue) {
  const seenReviewKeys = new Set()
  const uniqueReviewCards = []

  for (const card of reviewQueue) {
    const key = getFlashcardReviewKey(card)
    if (seenReviewKeys.has(key)) continue
    seenReviewKeys.add(key)
    uniqueReviewCards.push(card)
  }

  return [...cards, ...uniqueReviewCards]
}
