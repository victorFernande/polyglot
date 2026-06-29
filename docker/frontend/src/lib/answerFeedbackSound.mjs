const SOUND_SEQUENCES = {
  correct: [
    // Original, high, bright two-step reward: "tin-din" / "ka-ching".
    { frequency: 880, start: 0, duration: 0.22, gain: 0.88, type: 'triangle', harmonics: [{ frequency: 1760, gain: 0.34, type: 'sine' }] },
    { frequency: 1320, start: 0.14, duration: 0.32, gain: 0.98, type: 'sine', harmonics: [{ frequency: 2640, gain: 0.32, type: 'sine' }] },
  ],
  wrong: [
    // Lower, dry, falling "tum-dom" / soft bonk.
    { frequency: 196, start: 0, duration: 0.17, gain: 0.48, type: 'triangle' },
    { frequency: 130.81, start: 0.12, duration: 0.24, gain: 0.46, type: 'triangle' },
  ],
}

function audioContextConstructor(win) {
  return win?.AudioContext || win?.webkitAudioContext
}

function scheduleOscillator(ctx, note) {
  const now = ctx.currentTime || 0
  const start = now + note.start
  const end = start + note.duration
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = note.type
  oscillator.frequency.setValueAtTime(note.frequency, start)

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(note.gain, start + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(end)
}

function scheduleTone(ctx, note) {
  scheduleOscillator(ctx, note)
  for (const harmonic of note.harmonics || []) {
    scheduleOscillator(ctx, { ...harmonic, start: note.start, duration: note.duration })
  }
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
