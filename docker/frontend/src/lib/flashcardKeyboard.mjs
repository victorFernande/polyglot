export function handleFlashcardKeyDown(
  event,
  {
    cardsLength,
    next,
    prev,
    flip,
    showFront,
    markNeedsReview,
    canMarkNeedsReview = true,
    jumpToReviewQueue,
    canJumpToReviewQueue = false,
  },
) {
  if (!cardsLength) return false

  const key = event.key
  const action =
    key === 'ArrowRight'
      ? next
      : key === 'ArrowLeft'
        ? prev
        : key === ' ' || key === 'Enter'
          ? flip
          : key.toLowerCase() === 'r'
            ? showFront
            : key.toLowerCase() === 'n' && canMarkNeedsReview
              ? markNeedsReview
              : key.toLowerCase() === 'v' && canJumpToReviewQueue
                ? jumpToReviewQueue
                : null

  if (!action) return false

  event.preventDefault()
  action()
  return true
}
