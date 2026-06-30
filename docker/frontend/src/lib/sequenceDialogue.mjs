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

export function sequenceDialogueSupportForPhrase(item, phrase) {
  if (!Array.isArray(item?.pairs)) return ''
  const pair = item.pairs.find((entry) => Array.isArray(entry) && entry[1] === phrase)
  return pair?.[0] || ''
}
