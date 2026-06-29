const SOUND_SEQUENCES = {
  correct: [
    { frequency: 523.25, start: 0, duration: 0.075, gain: 0.055, type: 'sine' },
    { frequency: 659.25, start: 0.055, duration: 0.08, gain: 0.06, type: 'sine' },
    { frequency: 783.99, start: 0.115, duration: 0.12, gain: 0.052, type: 'triangle' },
  ],
  wrong: [
    { frequency: 196, start: 0, duration: 0.11, gain: 0.045, type: 'triangle' },
    { frequency: 146.83, start: 0.085, duration: 0.13, gain: 0.038, type: 'triangle' },
  ],
}

function audioContextConstructor(win) {
  return win?.AudioContext || win?.webkitAudioContext
}

function scheduleTone(ctx, note) {
  const now = ctx.currentTime || 0
  const start = now + note.start
  const end = start + note.duration
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = note.type
  oscillator.frequency.setValueAtTime(note.frequency, start)

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(note.gain, start + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(end)
}

export function createAnswerFeedbackSoundPlayer(win = globalThis.window) {
  let context = null

  function contextOrNull() {
    const AudioContextCtor = audioContextConstructor(win)
    if (!AudioContextCtor) return null
    if (!context) context = new AudioContextCtor()
    return context
  }

  function unlock() {
    try {
      const ctx = contextOrNull()
      if (!ctx) return false
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch?.(() => {})
      }
      return true
    } catch {
      return false
    }
  }

  function play(type) {
    const sequence = SOUND_SEQUENCES[type]
    if (!sequence) return false
    try {
      const ctx = contextOrNull()
      if (!ctx) return false
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch?.(() => {})
      }
      for (const note of sequence) scheduleTone(ctx, note)
      return true
    } catch {
      return false
    }
  }

  return { unlock, play }
}

let defaultPlayer = null
function defaultAnswerFeedbackSoundPlayer(win = globalThis.window) {
  if (!defaultPlayer) defaultPlayer = createAnswerFeedbackSoundPlayer(win)
  return defaultPlayer
}

export function unlockAnswerFeedbackSound(win = globalThis.window) {
  return defaultAnswerFeedbackSoundPlayer(win).unlock()
}

export function playAnswerFeedbackSound(type, win = globalThis.window) {
  return defaultAnswerFeedbackSoundPlayer(win).play(type)
}
