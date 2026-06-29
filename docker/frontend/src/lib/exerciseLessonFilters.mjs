export function lessonLanguageCode(lesson) {
  return lesson?.language_code || lesson?.language || null
}

export function filterExerciseLessonsByLanguage(lessons, languageCode) {
  if (!Array.isArray(lessons)) return []
  if (!languageCode || languageCode === 'all') return lessons
  return lessons.filter((lesson) => lessonLanguageCode(lesson) === languageCode)
}

function safeSessionCount(value) {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? count : 0
}

function formatProgressLabel(completed, total) {
  return `${completed}/${total} sessões`
}

export function summarizeExerciseLessonProgressByLanguage(lessons) {
  const summaries = { all: { completed: 0, total: 0 } }
  if (!Array.isArray(lessons)) {
    return { all: { completed: 0, total: 0, label: formatProgressLabel(0, 0) } }
  }

  for (const lesson of lessons) {
    const code = lessonLanguageCode(lesson)
    const completed = safeSessionCount(lesson?.completed_sessions)
    const total = safeSessionCount(lesson?.total_sessions)

    summaries.all.completed += completed
    summaries.all.total += total

    if (!code) continue
    if (!summaries[code]) summaries[code] = { completed: 0, total: 0 }
    summaries[code].completed += completed
    summaries[code].total += total
  }

  return Object.fromEntries(
    Object.entries(summaries).map(([code, summary]) => [
      code,
      { ...summary, label: formatProgressLabel(summary.completed, summary.total) },
    ])
  )
}
