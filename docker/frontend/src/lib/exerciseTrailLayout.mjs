export function cleanExercisePrompt(prompt) {
  return String(prompt || '').replace(/^Unidade\s+\d+\/\d+\s+—\s+.*?\s+·\s+Tópico\s+\d+\/\d+\s+—\s+.*?:\s*/i, '').trim()
}

export function sessionWindowForPage(nodes, requestedPage, pageSize = 10) {
  const safeNodes = Array.isArray(nodes) ? nodes : []
  const totalPages = Math.max(1, Math.ceil(safeNodes.length / pageSize))
  const page = Math.min(Math.max(Number.isInteger(requestedPage) ? requestedPage : 0, 0), totalPages - 1)
  const start = page * pageSize
  const end = Math.min(start + pageSize, safeNodes.length)
  return {
    page,
    start,
    end,
    visibleNodes: safeNodes.slice(start, end),
    canGoPrev: page > 0,
    canGoNext: page < totalPages - 1,
  }
}

export function pageForSessionNumber(sessionNumber, pageSize = 10) {
  const number = Math.max(1, Number(sessionNumber) || 1)
  return Math.floor((number - 1) / pageSize)
}
