export function getFlashcardFocusState({ studiedCount, reviewQueueCount, minimumStudiedCount = 10 }) {
  const safeStudiedCount = Math.max(0, studiedCount)
  const safeReviewQueueCount = Math.max(0, reviewQueueCount)
  const safeMinimumStudiedCount = Math.max(1, minimumStudiedCount)
  const reviewRate = safeStudiedCount === 0 ? 0 : safeReviewQueueCount / safeStudiedCount
  const reviewPercent = Math.round(reviewRate * 100)

  if (safeStudiedCount < safeMinimumStudiedCount) {
    return {
      studiedCount: safeStudiedCount,
      reviewQueueCount: safeReviewQueueCount,
      minimumStudiedCount: safeMinimumStudiedCount,
      reviewRate,
      reviewPercent,
      level: 'neutral',
      label: 'Aguardando dados',
      message: 'Estude mais alguns cards para gerar um resumo de foco.',
    }
  }

  if (reviewRate < 0.2) {
    return {
      studiedCount: safeStudiedCount,
      reviewQueueCount: safeReviewQueueCount,
      minimumStudiedCount: safeMinimumStudiedCount,
      reviewRate,
      reviewPercent,
      level: 'low',
      label: 'Ritmo bom',
      message: 'Siga no ritmo atual; poucos cards ficaram marcados para revisão.',
    }
  }

  if (reviewRate < 0.5) {
    return {
      studiedCount: safeStudiedCount,
      reviewQueueCount: safeReviewQueueCount,
      minimumStudiedCount: safeMinimumStudiedCount,
      reviewRate,
      reviewPercent,
      level: 'medium',
      label: 'Revise no fim do bloco',
      message: 'Revise os cards marcados ao fim do bloco antes de avançar rápido demais.',
    }
  }

  return {
    studiedCount: safeStudiedCount,
    reviewQueueCount: safeReviewQueueCount,
    minimumStudiedCount: safeMinimumStudiedCount,
    reviewRate,
    reviewPercent,
    level: 'high',
    label: 'Priorize revisão',
    message: 'Reduza a velocidade e priorize os cards marcados antes de continuar.',
  }
}

export function getFlashcardMicroGoalState({ studiedCount, goalSize = 10 }) {
  const safeStudiedCount = Math.max(0, studiedCount)
  const safeGoalSize = Math.max(1, goalSize)
  const displayedCount = Math.min(safeStudiedCount, safeGoalSize)
  const remainingCount = Math.max(0, safeGoalSize - safeStudiedCount)
  const isComplete = safeStudiedCount >= safeGoalSize

  return {
    studiedCount: safeStudiedCount,
    goalSize: safeGoalSize,
    displayedCount,
    remainingCount,
    isComplete,
    label: `Meta rápida: ${displayedCount}/${safeGoalSize} cards`,
    message: isComplete
      ? 'Meta rápida concluída.'
      : `Faltam ${remainingCount} cards para concluir a meta rápida.`,
  }
}

export function recordFlashcardRecall({ knownCount, unknownCount }, outcome) {
  return {
    knownCount: Math.max(0, knownCount) + (outcome === 'known' ? 1 : 0),
    unknownCount: Math.max(0, unknownCount) + (outcome === 'unknown' ? 1 : 0),
  }
}

export function getFlashcardRecallStats({ knownCount, unknownCount }) {
  const safeKnownCount = Math.max(0, knownCount)
  const safeUnknownCount = Math.max(0, unknownCount)
  const answeredCount = safeKnownCount + safeUnknownCount
  const recallPercent = answeredCount === 0
    ? 0
    : Math.round((safeKnownCount / answeredCount) * 100)

  return {
    knownCount: safeKnownCount,
    unknownCount: safeUnknownCount,
    answeredCount,
    recallPercent,
    recallLabel: `Taxa de lembrança: ${recallPercent}%`,
  }
}

function getFlashcardConfidenceLabel(confidencePercent, studiedCount) {
  if (studiedCount === 0) return 'Comece a estudar para medir confiança'
  if (confidencePercent >= 80) return 'Boa retenção nesta rodada'
  if (confidencePercent >= 40) return 'Continue revisando os marcados'
  return 'Sessão boa para reforço'
}

export function getFlashcardSessionStats({ deckCount, reviewQueueCount, currentIndex }) {
  const safeReviewQueueCount = Math.max(0, reviewQueueCount)
  const visibleCount = Math.max(0, deckCount + safeReviewQueueCount)
  const studiedCount = visibleCount === 0
    ? 0
    : Math.min(visibleCount, Math.max(0, currentIndex + 1))
  const markedStudiedCount = Math.min(studiedCount, safeReviewQueueCount)
  const confidencePercent = studiedCount === 0
    ? 0
    : Math.round(((studiedCount - markedStudiedCount) / studiedCount) * 100)
  const isComplete = visibleCount > 0 && studiedCount === visibleCount

  return {
    studiedCount,
    reviewQueueCount: safeReviewQueueCount,
    remainingCount: Math.max(0, visibleCount - studiedCount),
    isComplete,
    confidencePercent,
    confidenceLabel: getFlashcardConfidenceLabel(confidencePercent, studiedCount),
  }
}

export function getFlashcardReviewJumpState({ deckCount, reviewQueueCount, currentIndex }) {
  const reviewQueueStartIndex = Math.max(0, deckCount)

  return {
    canJumpToReviewQueue: reviewQueueCount > 0 && currentIndex < reviewQueueStartIndex,
    reviewQueueStartIndex,
  }
}
