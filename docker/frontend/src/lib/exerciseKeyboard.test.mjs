import test from 'node:test'
import assert from 'node:assert/strict'

import { handleExerciseKeyDown } from './exerciseKeyboard.mjs'

function makeEvent(key, target = null) {
  return {
    key,
    target,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true
    },
  }
}

function recorder() {
  const calls = []
  return {
    calls,
    handlers: {
      selectChoice: (option) => calls.push(['selectChoice', option]),
      check: () => calls.push(['check']),
      next: () => calls.push(['next']),
      clear: () => calls.push(['clear']),
    },
  }
}

function press(key, state = {}, target = null) {
  const event = makeEvent(key, target)
  const { calls, handlers } = recorder()
  const handled = handleExerciseKeyDown(event, {
    choiceOptions: ['eins', 'zwei', 'drei', 'vier'],
    canCheck: true,
    hasFeedback: false,
    busy: false,
    ...state,
    ...handlers,
  })
  return { handled, calls, defaultPrevented: event.defaultPrevented }
}

test('number keys select the matching visible choice option', () => {
  assert.deepEqual(press('1'), {
    handled: true,
    calls: [['selectChoice', 'eins']],
    defaultPrevented: true,
  })
  assert.deepEqual(press('4'), {
    handled: true,
    calls: [['selectChoice', 'vier']],
    defaultPrevented: true,
  })
})

test('number keys outside visible choice options are ignored', () => {
  assert.deepEqual(press('4', { choiceOptions: ['eins', 'zwei', 'drei'] }), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
})

test('Enter checks an unanswered exercise when a valid answer exists', () => {
  assert.deepEqual(press('Enter'), {
    handled: true,
    calls: [['check']],
    defaultPrevented: true,
  })
})

test('Enter continues after feedback is visible', () => {
  assert.deepEqual(press('Enter', { hasFeedback: true }), {
    handled: true,
    calls: [['next']],
    defaultPrevented: true,
  })
})

test('Escape clears the local answer state', () => {
  assert.deepEqual(press('Escape'), {
    handled: true,
    calls: [['clear']],
    defaultPrevented: true,
  })
})

test('shortcuts are ignored while busy or without an active item', () => {
  assert.deepEqual(press('Enter', { busy: true }), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
  assert.deepEqual(press('1', { hasItem: false }), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
})

test('shortcuts are ignored from editable targets', () => {
  const input = { tagName: 'INPUT', isContentEditable: false }
  assert.deepEqual(press('Enter', {}, input), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })

  const editable = { tagName: 'DIV', isContentEditable: true }
  assert.deepEqual(press('Escape', {}, editable), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
})

test('unmapped keys are ignored', () => {
  assert.deepEqual(press('ArrowRight'), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
})
