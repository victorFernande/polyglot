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

  const target = event.target
  const interactiveSelector = 'input, textarea, select, button, a, [contenteditable="true"], [role="button"], [role="link"], [role="menuitem"], [role="tab"]'
  const targetTag = target?.tagName?.toLowerCase()
  if (
    target?.isContentEditable ||
    (typeof target?.closest === 'function' && target.closest(interactiveSelector)) ||
    ['input', 'textarea', 'select', 'button', 'a'].includes(targetTag)
  ) {
    return false
  }

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
