import assert from 'node:assert/strict'
import { createSpeechPlaybackController } from './speechPlayback.mjs'

let audioInstances = []
class FakeAudio {
  constructor(url) {
    this.src = url
    this.paused = false
    this.pauseCalls = 0
    this.currentTime = 0
    audioInstances.push(this)
  }

  play() {
    return new Promise((resolve) => {
      this._resolvePlay = resolve
    })
  }

  pause() {
    this.paused = true
    this.pauseCalls += 1
    this._resolvePlay?.()
  }

  finish() {
    this.onended?.()
    this._resolvePlay?.()
  }
}

const revoked = []
const URLApi = {
  createObjectURL(blob) {
    return `blob:${blob.id}`
  },
  revokeObjectURL(url) {
    revoked.push(url)
  },
}

const synthesized = []
async function synthesizeSpeech(text, lang) {
  synthesized.push(`${lang}:${text}`)
  return { id: `${lang}-${text}` }
}

const controller = createSpeechPlaybackController({
  synthesizeSpeech,
  fallbackSpeakSegments: () => false,
  AudioCtor: FakeAudio,
  URLApi,
})

const first = controller.speakSegments([
  { text: 'como dizer “Olá” em Alemão?', lang: 'pt-BR' },
  { text: 'Hallo', lang: 'de-DE' },
])

await Promise.resolve()
await Promise.resolve()
assert.equal(audioInstances.length, 1)
assert.equal(audioInstances[0].src, 'blob:pt-BR-como dizer “Olá” em Alemão?')

const second = controller.speakSegments([
  { text: 'Correto. Resposta correta:', lang: 'pt-BR' },
])

await Promise.resolve()
await Promise.resolve()

assert.equal(audioInstances[0].pauseCalls, 1, 'starting a new playback must pause the currently playing audio')
assert.equal(audioInstances[0].currentTime, 0, 'starting a new playback must rewind the old audio')
assert.ok(revoked.includes('blob:pt-BR-como dizer “Olá” em Alemão?'), 'starting a new playback must release the old blob URL')
assert.equal(audioInstances.length, 2, 'second playback should start from the beginning with a new Audio instance')
assert.equal(audioInstances[1].src, 'blob:pt-BR-Correto. Resposta correta:')

audioInstances[1].finish()
await second
await first

assert.deepEqual(
  synthesized,
  [
    'pt-BR:como dizer “Olá” em Alemão?',
    'pt-BR:Correto. Resposta correta:',
  ],
  'cancelled playback must not continue to synthesize/speak the remaining old segments'
)
