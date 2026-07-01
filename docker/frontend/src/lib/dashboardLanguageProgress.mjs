export const LANGUAGE_PROGRESS_TOTAL_EXERCISES = 1000

export function normalizedLanguageProgress(progress) {
  const total = Number(progress?.total_exercises || LANGUAGE_PROGRESS_TOTAL_EXERCISES)
  const completed = Math.max(0, Math.min(total, Number(progress?.completed_exercises || 0)))
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return {
    completed,
    total,
    percent,
    label: `${completed}/${total} exercícios`,
  }
}
