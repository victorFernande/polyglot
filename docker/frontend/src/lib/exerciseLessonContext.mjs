export function lessonContextForExercise(lesson) {
  const title = typeof lesson?.title === 'string' ? lesson.title.trim() : ''
  if (!title) return null

  const description = typeof lesson?.description === 'string' ? lesson.description.trim() : ''
  const units = lesson?.units
  const topics = lesson?.topics
  return {
    label: 'Unidade atual',
    title,
    description,
    units,
    topics,
  }
}
