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

assert.equal(await player.unlock(), true, 'session completion fanfare must unlock during the continue/next click')
assert.ok(events.some(([name]) => name === 'ctx:resume'), 'unlock should resume the fanfare audio context')
assert.ok(
  events.some(([name]) => name === 'osc:start'),
  'unlock should prime Web Audio with a silent oscillator during the direct touch/click gesture for mobile Safari'
)

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
  events.filter(([name]) => name === 'gain:linear').some(([, value]) => value >= 1.05),
  'completion fanfare should be loud enough to feel like a session reward'
)

assert.equal(createSessionCompletionFanfarePlayer({}).play(), false, 'missing Web Audio support should fail silently')
assert.equal(unlockSessionCompletionFanfare({}), false, 'global unlock helper should fail silently without Web Audio')
assert.equal(playSessionCompletionFanfare({}), false, 'global play helper should fail silently without Web Audio')

const asyncEvents = []
let resolveAsyncResume
class DelayedResumeOscillator {
  constructor() {
    this.frequency = {
      setValueAtTime: (value) => asyncEvents.push(['freq:set', value]),
    }
    this.type = ''
  }
  connect(node) { return node }
  start() { asyncEvents.push(['osc:start']) }
  stop() {}
}
class DelayedResumeGain {
  constructor() {
    this.gain = {
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    }
  }
  connect(node) { return node }
}
class DelayedResumeAudioContext {
  constructor() {
    this.currentTime = 7
    this.destination = 'destination'
    this.state = 'suspended'
  }
  createOscillator() { return new DelayedResumeOscillator() }
  createGain() { return new DelayedResumeGain() }
  resume() {
    asyncEvents.push(['ctx:resume:start'])
    return new Promise((resolve) => {
      resolveAsyncResume = () => {
        this.state = 'running'
        asyncEvents.push(['ctx:resume:done'])
        resolve()
      }
    })
  }
}

const delayedPlayer = createSessionCompletionFanfarePlayer({ AudioContext: DelayedResumeAudioContext })
const delayedUnlock = delayedPlayer.unlock()
assert.equal(typeof delayedUnlock?.then, 'function', 'fanfare unlock should expose the browser resume promise to preview buttons')
const delayedPlay = delayedPlayer.play()
assert.equal(typeof delayedPlay?.then, 'function', 'fanfare play should wait for a suspended context to resume before scheduling notes')
assert.deepEqual(asyncEvents.filter(([name]) => name === 'freq:set'), [], 'fanfare notes must not be scheduled while the AudioContext is still suspended')
resolveAsyncResume()
assert.equal(await delayedUnlock, true)
assert.equal(await delayedPlay, true)
assert.ok(asyncEvents.some(([name]) => name === 'freq:set'), 'fanfare notes should be scheduled after the AudioContext resumes')
