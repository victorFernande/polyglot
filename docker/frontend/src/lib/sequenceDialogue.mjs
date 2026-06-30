function answerValue(answer) {
  if (answer && typeof answer === 'object' && 'value' in answer) return answer.value
  return answer
}

export function sequenceDialoguePayload(selectedPhrases) {
  return Array.isArray(selectedPhrases) ? selectedPhrases : []
}

export function sequenceDialogueCanSubmit(item, selectedPhrases) {
  if (item?.type !== 'sequence_dialogue') return false
  const answer = answerValue(item.answer)
  if (!Array.isArray(answer) || !Array.isArray(selectedPhrases)) return false
  return selectedPhrases.length === answer.length
}
