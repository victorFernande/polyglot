function isEditableTarget(target) {
  if (!target) return false
  if (target.isContentEditable) return true
  const tagName = String(target.tagName || '').toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

export function handleExerciseKeyDown(event, {
  hasItem = true,
  busy = false,
  choiceOptions = [],
  canCheck = false,
  hasFeedback = false,
  selectChoice,
  check,
  next,
  clear,
}) {
  if (!hasItem || busy || isEditableTarget(event.target)) return false

  const key = event.key
  let action = null

  if (/^[1-4]$/.test(key) && !hasFeedback) {
    const option = choiceOptions[Number(key) - 1]
    if (option !== undefined) action = () => selectChoice(option)
  } else if (key === 'Enter') {
    if (hasFeedback) action = next
    else if (canCheck) action = check
  } else if (key === 'Escape') {
    action = clear
  }

  if (!action) return false

  event.preventDefault()
  action()
  return true
}
