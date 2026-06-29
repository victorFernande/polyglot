const SOUND_SHAPES = {
  correct: { startHz: 660, endHz: 880, duration: 0.16, peakGain: 0.055, type: 'sine' },
  wrong: { startHz: 220, endHz: 160, duration: 0.18, peakGain: 0.045, type: 'triangle' },
}

export function playAnswerFeedbackSound(type, win = globalThis.window) {
  const shape = SOUND_SHAPES[type]
  const AudioContextCtor = win?.AudioContext || win?.webkitAudioContext
  if (!shape || !AudioContextCtor) return false

  try {
    const ctx = new AudioContextCtor()
    const now = ctx.currentTime || 0
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    const end = now + shape.duration

    oscillator.type = shape.type
    oscillator.frequency.setValueAtTime(shape.startHz, now)
    oscillator.frequency.exponentialRampToValueAtTime(shape.endHz, end)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(shape.peakGain, now + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)

    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now)
    oscillator.stop(end)

    const closeDelayMs = Math.ceil(shape.duration * 1000) + 40
    const timer = win?.setTimeout || globalThis.setTimeout
    if (typeof timer === 'function' && typeof ctx.close === 'function') {
      timer(() => {
        const closed = ctx.close()
        closed?.catch?.(() => {})
      }, closeDelayMs)
    }
    return true
  } catch {
    return false
  }
}
