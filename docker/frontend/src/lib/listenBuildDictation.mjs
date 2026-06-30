function answerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  return answer
}

export function buildListenBuildDictationPayload(text) {
  return String(text || '')
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
}

export function canSubmitListenBuildDictation(item, text) {
  const expected = answerValue(item?.answer)
  if (!Array.isArray(expected)) return false
  return buildListenBuildDictationPayload(text).length === expected.length
}
