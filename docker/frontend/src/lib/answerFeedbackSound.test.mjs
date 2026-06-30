import assert from 'node:assert/strict'
import { createAnswerFeedbackSoundPlayer, playAnswerFeedbackSound, unlockAnswerFeedbackSound } from './answerFeedbackSound.mjs'

const events = []
class FakeOscillator {
  constructor() {
    this.frequency = {
      setValueAtTime: (value, time) => events.push(['freq:set', value, Number(time.toFixed(3))]),
      exponentialRampToValueAtTime: (value, time) => events.push(['freq:ramp', value, Number(time.toFixed(3))]),
    }
    this.type = ''
  }
  connect(node) { events.push(['osc:connect', node.kind]); return node }
  start(time) { events.push(['osc:start', Number(time.toFixed(3))]) }
  stop(time) { events.push(['osc:stop', Number(time.toFixed(3))]) }
}
class FakeGain {
  constructor() {
    this.kind = 'gain'
    this.gain = {
      setValueAtTime: (value, time) => events.push(['gain:set', value, Number(time.toFixed(3))]),
      linearRampToValueAtTime: (value, time) => events.push(['gain:linear', value, Number(time.toFixed(3))]),
      exponentialRampToValueAtTime: (value, time) => events.push(['gain:ramp', value, Number(time.toFixed(3))]),
    }
  }
  connect(node) { events.push(['gain:connect', node]); return node }
}
class FakeAudioContext {
  constructor() {
    this.currentTime = 2
    this.destination = 'destination'
    this.state = 'suspended'
    events.push(['ctx:new'])
  }
  createOscillator() { return new FakeOscillator() }
  createGain() { return new FakeGain() }
  resume() { this.state = 'running'; events.push(['ctx:resume']); return Promise.resolve() }
}

const win = { AudioContext: FakeAudioContext }
const player = createAnswerFeedbackSoundPlayer(win)

assert.equal(player.unlock(), true, 'answer sound must be unlockable during the user click before awaiting the API')
assert.ok(events.some(([name]) => name === 'ctx:resume'), 'unlock should resume the context so browsers allow playback')

events.length = 0
assert.equal(player.play('correct'), true)
assert.deepEqual(
  events.filter(([name]) => name === 'freq:set').map(([, value]) => value),
  [880, 1760, 1320, 2640],
  'correct feedback should be a two-note rising tin-din/ka-ching with bright bell harmonics'
)
assert.equal(events.filter(([name]) => name === 'ctx:new').length, 0, 'play should reuse the unlocked context instead of creating a blocked one after the API response')
assert.ok(events.some(([name, value]) => name === 'gain:set' && value === 0.0001), 'sound must fade in from near silence')
assert.ok(events.some(([name, value]) => name === 'gain:ramp' && value === 0.0001), 'sound must fade out to avoid clicks')
assert.ok(
  events.filter(([name]) => name === 'gain:linear').some(([, value]) => value >= 1.35),
  'correct chime must be boosted well above spoken feedback volume'
)
assert.ok(
  Math.max(...events.filter(([name]) => name === 'osc:stop').map(([, time]) => time)) >= 2.45,
  'correct chime must last around 0.45s so the reward is clearly audible before speech'
)

events.length = 0
assert.equal(player.play('wrong'), true)
assert.deepEqual(
  events.filter(([name]) => name === 'freq:set').map(([, value]) => value),
  [196, 130.81],
  'wrong feedback should be a clear two-note low tum-dom/bonk falling tone'
)
assert.ok(
  events.filter(([name]) => name === 'gain:linear').some(([, value]) => value >= 0.85),
  'wrong tone should be clearly audible even when device volume is tuned for speech'
)
assert.ok(
  Math.max(...events.filter(([name]) => name === 'osc:stop').map(([, time]) => time)) >= 2.32,
  'wrong tone must last long enough to read as tum-dom, not a click'
)

assert.equal(createAnswerFeedbackSoundPlayer({}).play('correct'), false, 'missing Web Audio support should fail silently')
assert.equal(player.play('other'), false, 'unknown feedback type should not play anything')
assert.equal(unlockAnswerFeedbackSound({}), false, 'global unlock helper should fail silently without Web Audio')
assert.equal(playAnswerFeedbackSound('correct', {}), false, 'global play helper should fail silently without Web Audio')
