import assert from 'node:assert/strict'
import { playAnswerFeedbackSound } from './answerFeedbackSound.mjs'

const events = []
class FakeOscillator {
  constructor() {
    this.frequency = {
      setValueAtTime: (value, time) => events.push(['freq:set', value, time]),
      exponentialRampToValueAtTime: (value, time) => events.push(['freq:ramp', value, time]),
    }
    this.type = ''
  }
  connect(node) { events.push(['osc:connect', node.kind]); return node }
  start(time) { events.push(['osc:start', time]) }
  stop(time) { events.push(['osc:stop', Number(time.toFixed(3))]) }
}
class FakeGain {
  constructor() {
    this.kind = 'gain'
    this.gain = {
      setValueAtTime: (value, time) => events.push(['gain:set', value, time]),
      exponentialRampToValueAtTime: (value, time) => events.push(['gain:ramp', value, Number(time.toFixed(3))]),
    }
  }
  connect(node) { events.push(['gain:connect', node]); return node }
}
class FakeAudioContext {
  constructor() {
    this.currentTime = 2
    this.destination = 'destination'
    this.closed = false
    events.push(['ctx:new'])
  }
  createOscillator() { return new FakeOscillator() }
  createGain() { return new FakeGain() }
  close() { this.closed = true; events.push(['ctx:close']) }
}

const win = {
  AudioContext: FakeAudioContext,
  setTimeout(callback) {
    callback()
  },
}

assert.equal(playAnswerFeedbackSound('correct', win), true)
assert.deepEqual(
  events.filter(([name]) => name === 'freq:set' || name === 'freq:ramp').map(([, value]) => value),
  [660, 880],
  'correct feedback should play a short rising positive chime'
)
assert.ok(events.some(([name, value]) => name === 'gain:set' && value === 0.0001), 'sound must fade in from near silence')
assert.ok(events.some(([name, value]) => name === 'gain:ramp' && value === 0.0001), 'sound must fade out to avoid clicks')
assert.ok(events.some(([name]) => name === 'ctx:close'), 'audio context should be closed after the short effect')

events.length = 0
assert.equal(playAnswerFeedbackSound('wrong', win), true)
assert.deepEqual(
  events.filter(([name]) => name === 'freq:set' || name === 'freq:ramp').map(([, value]) => value),
  [220, 160],
  'wrong feedback should play a short falling soft tone'
)

assert.equal(playAnswerFeedbackSound('correct', {}), false, 'missing Web Audio support should fail silently')
assert.equal(playAnswerFeedbackSound('other', win), false, 'unknown feedback type should not play anything')
