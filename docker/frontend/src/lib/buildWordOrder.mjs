export function moveBuiltWord(words, index, direction) {
  if (!Array.isArray(words)) return []
  const targetIndex = index + direction
  if (index < 0 || index >= words.length || targetIndex < 0 || targetIndex >= words.length) {
    return [...words]
  }
  const next = [...words]
  const [word] = next.splice(index, 1)
  next.splice(targetIndex, 0, word)
  return next
}
