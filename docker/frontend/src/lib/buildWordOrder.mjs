function isValidIndex(words, index) {
  return Number.isInteger(index) && index >= 0 && index < words.length
}

export function reorderBuiltWords(words, fromIndex, toIndex) {
  if (!Array.isArray(words)) return []
  if (!isValidIndex(words, fromIndex) || !isValidIndex(words, toIndex) || fromIndex === toIndex) {
    return [...words]
  }
  const next = [...words]
  const [word] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, word)
  return next
}

export function moveBuiltWord(words, index, direction) {
  return reorderBuiltWords(words, index, index + direction)
}
