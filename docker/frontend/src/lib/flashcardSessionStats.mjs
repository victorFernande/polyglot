export function getFlashcardMicroGoalState({ studiedCount, goalSize = 10 }) {
  const safeStudiedCount = Math.max(0, studiedCount)
  const safeGoalSize = Math.max(1, goalSize)
  const displayedCount = Math.min(safeStudiedCount, safeGoalSize)
  const remainingCount = Math.max(0, safeGoalSize - safeStudiedCount)
  const isComplete = safeStudiedCount >= safeGoalSize

  return {
    studiedCount: safeStudiedCount,
    goalSize: safeGoalSize,
    displayedCount,
    remainingCount,
    isComplete,
    label: `Meta rápida: ${displayedCount}/${safeGoalSize} cards`,
    message: isComplete
      ? 'Meta rápida concluída.'
      : `Faltam ${remainingCount} cards para concluir a meta rápida.`,
  }
}

export function getFlashcardSessionStats({ deckCount, reviewQueueCount, currentIndex }) {
  const visibleCount = Math.max(0, deckCount + reviewQueueCount)
  const studiedCount = visibleCount === 0
    ? 0
    : Math.min(visibleCount, Math.max(0, currentIndex + 1))
  const isComplete = visibleCount > 0 && studiedCount === visibleCount

  return {
    studiedCount,
    reviewQueueCount: Math.max(0, reviewQueueCount),
    remainingCount: Math.max(0, visibleCount - studiedCount),
    isComplete,
  }
}

export function getFlashcardReviewJumpState({ deckCount, reviewQueueCount, currentIndex }) {
  const reviewQueueStartIndex = Math.max(0, deckCount)

  return {
    canJumpToReviewQueue: reviewQueueCount > 0 && currentIndex < reviewQueueStartIndex,
    reviewQueueStartIndex,
  }
}
