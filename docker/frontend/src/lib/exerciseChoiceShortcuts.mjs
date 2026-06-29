export function choiceShortcutLabels(options) {
  return (options || []).map((_, index) => (index < 4 ? String(index + 1) : null))
}
