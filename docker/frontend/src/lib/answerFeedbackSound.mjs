const SOUND_SEQUENCES = {
  correct: [
    // Original, high, bright two-step reward: "tin-din" / "ka-ching".
    { frequency: 880, start: 0, duration: 0.22, gain: 1.22, type: 'triangle', harmonics: [{ frequency: 1760, gain: 0.48, type: 'sine' }] },
    { frequency: 1320, start: 0.14, duration: 0.32, gain: 1.42, type: 'sine', harmonics: [{ frequency: 2640, gain: 0.44, type: 'sine' }] },
  ],
  wrong: [
    // Lower, dry, falling "tum-dom" / soft bonk.
    { frequency: 196, start: 0, duration: 0.17, gain: 0.88, type: 'triangle' },
    { frequency: 130.81, start: 0.12, duration: 0.24, gain: 0.86, type: 'triangle' },
  ],
}

const SOUND_DURATIONS = { correct: 0.52, wrong: 0.42 }

function audioContextConstructor(win) {
  return win?.AudioContext || win?.webkitAudioContext
}

function audioConstructor(win) {
  return win?.Audio || globalThis.Audio
}

function userAgent(win) {
  return win?.navigator?.userAgent || globalThis.navigator?.userAgent || ''
}

function shouldUseHtmlAudioFallback(win) {
  return /Mobi|Android|iPhone|iPad|iPod|Mobile|CriOS|FxiOS/i.test(userAgent(win))
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

function primeAudioContext(ctx) {
  try {
    const now = ctx.currentTime || 0
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    gain.gain.setValueAtTime(0, now)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.01)
  } catch {
    // Best-effort mobile Safari unlock primer. Real playback still uses resume/play fallbacks.
  }
}

function noteValue(note, t) {
  const local = t - note.start
  if (local < 0 || local > note.duration) return 0
  const attack = Math.min(0.02, note.duration / 3)
  const env = local < attack ? local / attack : Math.max(0, 1 - ((local - attack) / (note.duration - attack))) ** 1.7
  const phase = 2 * Math.PI * note.frequency * local
  let value = Math.sin(phase)
  if (note.type === 'triangle') value = (2 / Math.PI) * Math.asin(Math.sin(phase))
  if (note.type === 'sawtooth') value = 2 * ((note.frequency * local) % 1) - 1
  value *= note.gain * 0.22 * env
  for (const harmonic of note.harmonics || []) {
    value += Math.sin(2 * Math.PI * harmonic.frequency * local) * harmonic.gain * 0.18 * env
  }
  return value
}

function fallbackDataUri(sequence, duration, win) {
  const btoaFn = win?.btoa || globalThis.btoa
  if (!btoaFn) return null
  const sampleRate = 16000
  const sampleCount = Math.ceil(duration * sampleRate)
  const samples = []
  let peak = 0.0001
  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate
    const value = sequence.reduce((sum, note) => sum + noteValue(note, t), 0)
    samples.push(value)
    peak = Math.max(peak, Math.abs(value))
  }
  const scale = peak > 0.92 ? 0.92 / peak : 1
  const dataSize = sampleCount * 2
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  let offset = 0
  function writeString(value) {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i))
    offset += value.length
  }
  function writeUint32(value) { view.setUint32(offset, value, true); offset += 4 }
  function writeUint16(value) { view.setUint16(offset, value, true); offset += 2 }

  writeString('RIFF')
  writeUint32(36 + dataSize)
  writeString('WAVE')
  writeString('fmt ')
  writeUint32(16)
  writeUint16(1)
  writeUint16(1)
  writeUint32(sampleRate)
  writeUint32(sampleRate * 2)
  writeUint16(2)
  writeUint16(16)
  writeString('data')
  writeUint32(dataSize)
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample * scale))
    view.setInt16(offset, Math.round(clamped * 32767), true)
    offset += 2
  }
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return `data:audio/wav;base64,${btoaFn(binary)}`
}

export function createAnswerFeedbackSoundPlayer(win = globalThis.window) {
  let context = null
  let resumePromise = null
  const fallbackUris = {}

  function contextOrNull() {
    const AudioContextCtor = audioContextConstructor(win)
    if (!AudioContextCtor) return null
    if (!context) context = new AudioContextCtor()
    return context
  }

  function fallbackUri(type) {
    if (!fallbackUris[type]) fallbackUris[type] = fallbackDataUri(SOUND_SEQUENCES[type], SOUND_DURATIONS[type], win)
    return fallbackUris[type]
  }

  function playHtmlFallback(type) {
    try {
      const AudioCtor = audioConstructor(win)
      const uri = fallbackUri(type)
      if (!AudioCtor || !uri) return false
      const audio = new AudioCtor(uri)
      audio.volume = 1
      const played = audio.play?.()
      played?.catch?.(() => {})
      return true
    } catch {
      return false
    }
  }

  function resumeContext(ctx) {
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      if (!resumePromise) {
        resumePromise = Promise.resolve(ctx.resume())
          .then(() => true)
          .catch(() => false)
          .finally(() => { resumePromise = null })
      }
      return resumePromise
    }
    return true
  }

  function unlock() {
    try {
      const ctx = contextOrNull()
      if (ctx) {
        primeAudioContext(ctx)
        return resumeContext(ctx)
      }
      return Boolean(audioConstructor(win))
    } catch {
      return false
    }
  }

  function play(type) {
    const sequence = SOUND_SEQUENCES[type]
    if (!sequence) return false
    const htmlFallback = shouldUseHtmlAudioFallback(win) ? playHtmlFallback(type) : false
    try {
      const ctx = contextOrNull()
      if (!ctx) return htmlFallback
      const resumed = resumeContext(ctx)
      if (resumed?.then) {
        return resumed.then((ok) => {
          if (!ok) return htmlFallback
          for (const note of sequence) scheduleTone(ctx, note)
          return true
        })
      }
      if (!resumed) return htmlFallback
      for (const note of sequence) scheduleTone(ctx, note)
      return true
    } catch {
      return htmlFallback
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
