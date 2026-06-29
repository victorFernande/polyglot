export function handleFlashcardKeyDown(
  event,
  { cardsLength, next, prev, flip, showFront, markNeedsReview, canMarkNeedsReview = true },
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
              : null

  if (!action) return false

  event.preventDefault()
  action()
  return true
}
