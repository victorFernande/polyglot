function hashString(value) {
  const text = String(value ?? '')
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function stableShuffle(items, seed) {
  return [...items]
    .map((item) => ({ item, sortKey: hashString(`${seed}:${item.id}`) }))
    .sort((left, right) => left.sortKey - right.sortKey || left.item.id.localeCompare(right.item.id))
    .map(({ item }) => item)
}

export function buildMemoryMatchCards(pairs = [], seed = '') {
  const cards = pairs.flatMap(([left, right], index) => {
    const pairKey = `pair-${index}`
    return [
      { id: `${pairKey}:left`, pairKey, side: 'left', value: left, matchValue: right },
      { id: `${pairKey}:right`, pairKey, side: 'right', value: right, matchValue: left },
    ]
  })

  return stableShuffle(cards, seed)
}

export function isMemoryMatchPair(first, second) {
  return Boolean(
    first &&
    second &&
    first.id !== second.id &&
    first.pairKey === second.pairKey &&
    first.side !== second.side,
  )
}

export function memoryMatchSelection({ selectedCards = [], matched = {} }) {
  if (selectedCards.length < 2) {
    return { matched, shouldClearSelection: false, isPairFound: false }
  }

  const [first, second] = selectedCards
  if (!isMemoryMatchPair(first, second)) {
    return { matched, shouldClearSelection: true, isPairFound: false }
  }

  const leftCard = first.side === 'left' ? first : second
  const rightCard = first.side === 'right' ? first : second
  return {
    matched: { ...matched, [leftCard.value]: rightCard.value },
    shouldClearSelection: true,
    isPairFound: true,
  }
}
