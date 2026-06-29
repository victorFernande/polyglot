const EXERCISE_TYPE_HINTS = {
  choice: 'Escolha a melhor resposta.',
  listen_choice: 'Ouça e escolha o que corresponde.',
  context_choice: 'Use o contexto para escolher.',
  image_choice: 'Escolha a imagem correta.',
  build: 'Monte a frase na ordem correta.',
  match: 'Relacione cada item ao par correto.',
}

export function hintForExerciseType(type) {
  return EXERCISE_TYPE_HINTS[type] || 'Responda à atividade.'
}
