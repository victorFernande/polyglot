export function getFlashcardSessionStats({ deckCount, reviewQueueCount, currentIndex }) {
  const visibleCount = Math.max(0, deckCount + reviewQueueCount)
  const studiedCount = visibleCount === 0
    ? 0
    : Math.min(visibleCount, Math.max(0, currentIndex + 1))

  return {
    studiedCount,
    reviewQueueCount: Math.max(0, reviewQueueCount),
    remainingCount: Math.max(0, visibleCount - studiedCount),
  }
}
