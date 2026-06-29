const DEFAULT_USER_ID = 1

export function normalizeUserId(value, fallback = DEFAULT_USER_ID) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function bootstrapPathForUserId(value) {
  return `/users/${encodeURIComponent(normalizeUserId(value))}/bootstrap`
}
