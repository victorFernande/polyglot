import assert from 'node:assert/strict'
import { createSessionCompletionFanfarePlayer, playSessionCompletionFanfare, unlockSessionCompletionFanfare } from './sessionCompletionFanfare.mjs'

const events = []
class FakeOscillator {
  constructor() {
    this.frequency = {
      setValueAtTime: (value, time) => events.push(['freq:set', value, Number(time.toFixed(3))]),
    }
    this.type = ''
  }
  connect(node) { events.push(['osc:connect', node.kind || node]); return node }
  start(time) { events.push(['osc:start', Number(time.toFixed(3)), this.type]) }
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
    this.currentTime = 3
    this.destination = 'destination'
    this.state = 'suspended'
    events.push(['ctx:new'])
  }
  createOscillator() { return new FakeOscillator() }
  createGain() { return new FakeGain() }
  resume() { this.state = 'running'; events.push(['ctx:resume']); return Promise.resolve() }
}

const win = { AudioContext: FakeAudioContext }
const player = createSessionCompletionFanfarePlayer(win)

assert.equal(player.unlock(), true, 'session completion fanfare must unlock during the continue/next click')
assert.ok(events.some(([name]) => name === 'ctx:resume'), 'unlock should resume the fanfare audio context')

events.length = 0
assert.equal(player.play(), true)
assert.deepEqual(
  events.filter(([name]) => name === 'freq:set').map(([, value]) => value),
  [523.25, 659.25, 783.99, 1046.5],
  'completion fanfare should be an ascending ta-ta-ta-taaa melody'
)
assert.deepEqual(
  events.filter(([name]) => name === 'osc:start').map(([, , type]) => type),
  ['sawtooth', 'sawtooth', 'sawtooth', 'sawtooth'],
  'completion fanfare should use a bright synthetic brass/cartoon trumpet tone'
)
assert.ok(
  Math.max(...events.filter(([name]) => name === 'osc:stop').map(([, time]) => time)) >= 4.15,
  'completion fanfare should last about 1.15s with a longer final note'
)
assert.ok(
  Math.max(...events.filter(([name]) => name === 'osc:stop').map(([, time]) => time)) < 5,
  'completion fanfare must stay under two seconds'
)
assert.ok(
  events.filter(([name]) => name === 'gain:linear').some(([, value]) => value <= 0.3 && value >= 0.22),
  'completion fanfare should be polished and not louder than answer chimes'
)

assert.equal(createSessionCompletionFanfarePlayer({}).play(), false, 'missing Web Audio support should fail silently')
assert.equal(unlockSessionCompletionFanfare({}), false, 'global unlock helper should fail silently without Web Audio')
assert.equal(playSessionCompletionFanfare({}), false, 'global play helper should fail silently without Web Audio')
