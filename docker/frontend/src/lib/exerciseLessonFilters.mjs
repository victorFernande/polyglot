export function lessonLanguageCode(lesson) {
  return lesson?.language_code || lesson?.language || null
}

export function filterExerciseLessonsByLanguage(lessons, languageCode) {
  if (!Array.isArray(lessons)) return []
  if (!languageCode || languageCode === 'all') return lessons
  return lessons.filter((lesson) => lessonLanguageCode(lesson) === languageCode)
}
