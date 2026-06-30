const FANFARE_NOTES = [
  { frequency: 523.25, start: 0, duration: 0.16, gain: 0.92 },
  { frequency: 659.25, start: 0.18, duration: 0.16, gain: 0.98 },
  { frequency: 783.99, start: 0.36, duration: 0.18, gain: 1.04 },
  { frequency: 1046.5, start: 0.58, duration: 0.58, gain: 1.12 },
]

function audioContextConstructor(win) {
  return win?.AudioContext || win?.webkitAudioContext
}

function scheduleBrassNote(ctx, note) {
  const now = ctx.currentTime || 0
  const start = now + note.start
  const end = start + note.duration
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sawtooth'
  oscillator.frequency.setValueAtTime(note.frequency, start)

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(note.gain, start + 0.025)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(end)
}

export function createSessionCompletionFanfarePlayer(win = globalThis.window) {
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

  function play() {
    try {
      const ctx = contextOrNull()
      if (!ctx) return false
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch?.(() => {})
      }
      for (const note of FANFARE_NOTES) scheduleBrassNote(ctx, note)
      return true
    } catch {
      return false
    }
  }

  return { unlock, play }
}

let defaultPlayer = null
function defaultSessionCompletionFanfarePlayer(win = globalThis.window) {
  if (!defaultPlayer) defaultPlayer = createSessionCompletionFanfarePlayer(win)
  return defaultPlayer
}

export function unlockSessionCompletionFanfare(win = globalThis.window) {
  return defaultSessionCompletionFanfarePlayer(win).unlock()
}

export function playSessionCompletionFanfare(win = globalThis.window) {
  return defaultSessionCompletionFanfarePlayer(win).play()
}
