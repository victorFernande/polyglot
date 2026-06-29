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

export function trailHeaderLayoutClasses() {
  return {
    wrapper: 'mb-5 space-y-5',
    contextCard: 'w-full rounded-2xl border border-polyglot-accent/20 bg-polyglot-accent/10 p-4 break-words',
    mobileTrail: 'flex items-center gap-2 lg:hidden',
    mobileTrailNodes: 'flex min-w-0 flex-1 items-center',
    mobileConnector: 'mx-1 h-1 flex-1 rounded-full',
    desktopTrail: 'hidden items-center gap-3 lg:flex',
    desktopTrailNodes: 'flex min-w-0 flex-1 items-center',
    nodeLabel: 'text-xs',
  }
}

export function isTrailSessionEnabled(node, completedSessions, currentSessionNumber) {
  return node?.number <= completedSessions + 1 || node?.number === currentSessionNumber
}

export function trailNodeStateClasses(node, isActiveSession) {
  if (node?.status === 'completed') return 'border-polyglot-green bg-polyglot-green/20 text-polyglot-green hover:scale-105'
  if (isActiveSession) return 'border-polyglot-accent bg-polyglot-accent/20 text-polyglot-accent ring-2 ring-polyglot-accent/50 shadow-[0_0_18px_rgba(233,69,96,0.35)]'
  return 'border-white/10 bg-white/5 text-gray-500'
}
