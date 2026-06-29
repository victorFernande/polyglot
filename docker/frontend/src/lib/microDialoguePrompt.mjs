const DIALOGUE_LINE_PATTERN = /(?:^|[·—:])\s*(Pessoa|Você)\s*:\s*(.+)$/i

export function parseMicroDialoguePrompt(prompt) {
  if (typeof prompt !== 'string') return null

  const lines = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  let partner = null
  let learner = null
  const instructionLines = []

  for (const line of lines) {
    const dialogueMatch = line.match(DIALOGUE_LINE_PATTERN)
    if (dialogueMatch) {
      const label = dialogueMatch[1]
      const text = dialogueMatch[2].trim()
      if (/^pessoa$/i.test(label)) partner = { label: 'Pessoa', text }
      if (/^você$/i.test(label)) learner = { label: 'Você', text }
      continue
    }
    instructionLines.push(line)
  }

  if (!partner || !learner) return null

  return {
    partnerLabel: partner.label,
    partnerText: partner.text,
    learnerLabel: learner.label,
    learnerText: learner.text,
    instruction: instructionLines.join(' ').trim(),
  }
}
