function hashString(value) {
  const text = String(value ?? '')
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function nextRandom(state) {
  let next = state >>> 0
  next ^= next << 13
  next ^= next >>> 17
  next ^= next << 5
  return [next >>> 0, ((next >>> 0) % 100000) / 100000]
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function rotateByOne(values) {
  if (values.length <= 1) return values
  return [...values.slice(1), values[0]]
}

export function stableShuffle(values, seed) {
  const original = [...values]
  const shuffled = [...values]
  let state = hashString(seed)
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const [nextState, random] = nextRandom(state)
    state = nextState
    const swapIndex = Math.floor(random * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  if (arraysEqual(shuffled, original)) return rotateByOne(shuffled)
  return shuffled
}

export function orderedMatchColumns(item) {
  const pairs = Array.isArray(item?.pairs) ? item.pairs : (item?.answer?.pairs || [])
  const leftItems = pairs.map(([left]) => left)
  const rightItems = pairs.map(([, right]) => right)
  const seedBase = `${item?.id ?? item?.order_index ?? 'match'}:${item?.type ?? 'match'}`
  return {
    leftItems: stableShuffle(leftItems, `${seedBase}:left`),
    rightItems: stableShuffle(rightItems, `${seedBase}:right`),
  }
}
