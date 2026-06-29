import test from 'node:test'
import assert from 'node:assert/strict'

import { handleFlashcardKeyDown } from './flashcardKeyboard.mjs'

function recorder() {
  const calls = []
  return {
    calls,
    handlers: {
      next: () => calls.push('next'),
      prev: () => calls.push('prev'),
      flip: () => calls.push('flip'),
      showFront: () => calls.push('showFront'),
      markNeedsReview: () => calls.push('markNeedsReview'),
      jumpToReviewQueue: () => calls.push('jumpToReviewQueue'),
    },
  }
}

function press(key, cardsLength = 3, overrides = {}, eventProps = {}) {
  const event = {
    key,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true
    },
    ...eventProps,
  }
  const { calls, handlers } = recorder()
  const handled = handleFlashcardKeyDown(event, { cardsLength, ...handlers, ...overrides })
  return { handled, calls, defaultPrevented: event.defaultPrevented }
}

function target(tagName, props = {}) {
  return { tagName, isContentEditable: false, ...props }
}

test('ArrowRight advances to the next flashcard', () => {
  assert.deepEqual(press('ArrowRight'), {
    handled: true,
    calls: ['next'],
    defaultPrevented: true,
  })
})

test('ArrowLeft returns to the previous flashcard', () => {
  assert.deepEqual(press('ArrowLeft'), {
    handled: true,
    calls: ['prev'],
    defaultPrevented: true,
  })
})

test('Space and Enter flip the current flashcard', () => {
  assert.deepEqual(press(' '), {
    handled: true,
    calls: ['flip'],
    defaultPrevented: true,
  })
  assert.deepEqual(press('Enter'), {
    handled: true,
    calls: ['flip'],
    defaultPrevented: true,
  })
})

test('R returns the current flashcard to the front side', () => {
  assert.deepEqual(press('r'), {
    handled: true,
    calls: ['showFront'],
    defaultPrevented: true,
  })
  assert.deepEqual(press('R'), {
    handled: true,
    calls: ['showFront'],
    defaultPrevented: true,
  })
})

test('N marks a normal flashcard for review later', () => {
  assert.deepEqual(press('n'), {
    handled: true,
    calls: ['markNeedsReview'],
    defaultPrevented: true,
  })
  assert.deepEqual(press('N'), {
    handled: true,
    calls: ['markNeedsReview'],
    defaultPrevented: true,
  })
})

test('N is ignored when the current flashcard cannot be marked for review', () => {
  assert.deepEqual(press('n', 3, { canMarkNeedsReview: false }), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
})

test('V jumps directly to marked flashcards when review is available', () => {
  assert.deepEqual(press('v', 3, { canJumpToReviewQueue: true }), {
    handled: true,
    calls: ['jumpToReviewQueue'],
    defaultPrevented: true,
  })
  assert.deepEqual(press('V', 3, { canJumpToReviewQueue: true }), {
    handled: true,
    calls: ['jumpToReviewQueue'],
    defaultPrevented: true,
  })
})

test('V is ignored when there are no marked flashcards to review', () => {
  assert.deepEqual(press('v', 3, { canJumpToReviewQueue: false }), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
})

test('keys are ignored until flashcards are loaded', () => {
  assert.deepEqual(press('ArrowRight', 0), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
})

test('keyboard shortcuts are ignored inside editable fields', () => {
  assert.deepEqual(press('Enter', 3, {}, { target: target('INPUT') }), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
  assert.deepEqual(press(' ', 3, {}, { target: target('TEXTAREA') }), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
  assert.deepEqual(press('r', 3, {}, { target: target('DIV', { isContentEditable: true }) }), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
})

test('keyboard shortcuts are ignored on interactive controls to avoid duplicate actions', () => {
  assert.deepEqual(press('Enter', 3, {}, { target: target('BUTTON') }), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
  assert.deepEqual(press(' ', 3, {}, { target: target('A') }), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
})

test('unmapped keys are ignored', () => {
  assert.deepEqual(press('Escape'), {
    handled: false,
    calls: [],
    defaultPrevented: false,
  })
})
