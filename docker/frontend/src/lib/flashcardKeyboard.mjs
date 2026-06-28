export function handleFlashcardKeyDown(event, { cardsLength, next, prev, flip, showFront }) {
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
            : null

  if (!action) return false

  event.preventDefault()
  action()
  return true
}
