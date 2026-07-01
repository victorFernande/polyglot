export function instructionForItemType(item = {}) {
  const byType = {
    choice: 'Escolha a resposta correta:',
    listen_choice: 'Ouça e escolha:',
    context_choice: 'Escolha a melhor resposta:',
    image_choice: 'Observe e escolha:',
    build: 'Monte a frase:',
    listen_build: 'Ouça e monte:',
    sequence_dialogue: 'Ordene o diálogo:',
    match: 'Relacione os pares:',
    listen_match: 'Ouça e relacione:',
  }
  return byType[item.type] || 'Responda:'
}

export function progressPercentForSession(session = {}) {
  const total = Math.max(1, Number(session.total_count || 0))
  const current = Math.max(0, Number(session.current_index || 0))
  return Math.min(100, Math.round((current / total) * 100))
}

export function feedbackToneForResult(feedback) {
  if (!feedback) return 'idle'
  return feedback.type === 'correct' ? 'correct' : 'wrong'
}

export function difficultyLabelForItem(item = {}) {
  return ['build', 'listen_build', 'sequence_dialogue', 'match', 'listen_match'].includes(item.type) ? 'MAIS DIFÍCIL' : ''
}
