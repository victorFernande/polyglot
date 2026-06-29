export function lessonContextForExercise(lesson) {
  const title = typeof lesson?.title === 'string' ? lesson.title.trim() : ''
  if (!title) return null

  const description = typeof lesson?.description === 'string' ? lesson.description.trim() : ''
  return {
    label: 'Unidade atual',
    title,
    description,
  }
}
