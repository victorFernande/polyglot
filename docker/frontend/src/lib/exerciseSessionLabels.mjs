export function nextExerciseActionLabel(session) {
  if ((session?.current_index || 0) >= (session?.total_count || 0)) {
    return 'Salvar e ir para próxima sessão'
  }
  return 'Continuar'
}

export function sessionNumberForExerciseSession(session, lesson) {
  if (session?.session_number) return session.session_number
  return (lesson?.completed_sessions || 0) + 1
}
