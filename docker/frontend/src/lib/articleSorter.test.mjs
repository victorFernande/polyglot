import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ARTICLE_SORTER_BUCKETS,
  buildArticleSorterRound,
  validateArticleSorterBuckets,
} from './articleSorter.mjs'

const germanItems = [
  { id: 'teacher', prompt: 'Escolha professor.', answer: { value: 'der Lehrer' } },
  { id: 'cat', prompt: 'Escolha gato.', answer: { value: 'die Katze' } },
  { id: 'house', prompt: 'Escolha casa.', answer: { value: 'das Haus' } },
  { id: 'child', prompt: 'Escolha criança.', answer: { value: 'das Kind' } },
  { id: 'woman', prompt: 'Escolha mulher.', answer: { value: 'die Frau' } },
  { id: 'man', prompt: 'Escolha homem.', answer: { value: 'der Mann' } },
  { id: 'duplicate', prompt: 'Duplicado.', answer: { value: 'Der Lehrer' } },
  { id: 'not-noun', prompt: 'Sem artigo.', answer: { value: 'Wasser' } },
]

test('buildArticleSorterRound creates a German-only der die das bucket round from unique session nouns', () => {
  const round = buildArticleSorterRound(germanItems, {
    lesson: { id: 'de-u1', language_code: 'de' },
    session: { id: 'session-1' },
    currentIndex: 0,
  })

  assert.equal(round.buckets, ARTICLE_SORTER_BUCKETS)
  assert.equal(round.cards.length, 6)
  assert.equal(new Set(round.cards.map((card) => card.noun.toLocaleLowerCase())).size, round.cards.length)
  assert.deepEqual(
    round.cards.map((card) => card.article).sort(),
    ['das', 'das', 'der', 'der', 'die', 'die'],
  )
  assert.equal(round.cards.every((card) => card.id && card.seed && card.fullAnswer === `${card.article} ${card.noun}`), true)
})

test('buildArticleSorterRound is German-only and requires at least four eligible cards', () => {
  assert.deepEqual(buildArticleSorterRound(germanItems, { lesson: { id: 'fr-u1', language_code: 'fr' }, session: { id: 's1' } }), { buckets: ARTICLE_SORTER_BUCKETS, cards: [] })
  assert.deepEqual(buildArticleSorterRound(germanItems.slice(0, 3), { lesson: { id: 'de-u1', language_code: 'de' }, session: { id: 's1' } }), { buckets: ARTICLE_SORTER_BUCKETS, cards: [] })
})

test('validateArticleSorterBuckets scores all card assignments and reports corrections', () => {
  const round = buildArticleSorterRound(germanItems, {
    lesson: { id: 'de-u1', language_code: 'de' },
    session: { id: 'session-1' },
    currentIndex: 0,
  })
  const assignments = Object.fromEntries(round.cards.map((card) => [card.id, card.article]))
  assignments[round.cards.find((card) => card.article === 'die').id] = 'der'

  const result = validateArticleSorterBuckets(assignments, round.cards)

  assert.equal(result.total, 6)
  assert.equal(result.correct, 5)
  assert.equal(result.status, 'partial')
  assert.equal(result.items.filter((item) => item.status === 'wrong').length, 1)
  assert.match(result.items.find((item) => item.status === 'wrong').feedback, /Resposta esperada: (der|die|das) /)
})

test('validateArticleSorterBuckets treats missing or invalid buckets as wrong without mutating cards', () => {
  const card = { id: 'house', article: 'das', noun: 'Haus', fullAnswer: 'das Haus' }

  assert.deepEqual(validateArticleSorterBuckets({ house: 'dem' }, [card]), {
    total: 1,
    correct: 0,
    status: 'partial',
    items: [{ id: 'house', noun: 'Haus', selected: '', expected: 'das', fullAnswer: 'das Haus', status: 'wrong', feedback: 'Resposta esperada: das Haus' }],
  })
  assert.deepEqual(card, { id: 'house', article: 'das', noun: 'Haus', fullAnswer: 'das Haus' })
})
