function nonNegativeNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return 0
  return number
}

export function exerciseSessionProgress(session) {
  const total = nonNegativeNumber(session?.total_count)
  const answered = Math.min(nonNegativeNumber(session?.current_index), total || nonNegativeNumber(session?.current_index))
  const correct = Math.min(nonNegativeNumber(session?.correct_count), answered || nonNegativeNumber(session?.correct_count))
  const xpEarned = nonNegativeNumber(session?.xp_earned)
  const remaining = Math.max(total - answered, 0)
  const accuracyPercent = answered > 0 ? Math.round((correct / answered) * 100) : 0

  return {
    answered,
    total,
    remaining,
    correct,
    accuracyPercent,
    xpEarned,
  }
}
