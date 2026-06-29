export function buildExerciseFeedback(result, item, currentIndex) {
  const base = {
    explanation: result.explanation,
    correctAnswer: result.correct_answer || item?.answer,
    itemSnapshot: item,
    answeredIndex: currentIndex,
  }

  if (result.is_correct) {
    return {
      ...base,
      type: 'correct',
    }
  }

  return {
    ...base,
    type: 'wrong',
    mistake: result.mistake_feedback,
  }
}
