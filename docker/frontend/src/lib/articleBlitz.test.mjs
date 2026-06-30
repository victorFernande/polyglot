import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildArticleBlitzQueue,
  normalizeGermanArticle,
  validateArticleBlitzSelection,
} from './articleBlitz.mjs'

const germanItems = [
  { id: 1, prompt: 'Escolha professor.', answer: { value: 'der Lehrer' } },
  { id: 2, prompt: 'Escolha gato.', answer: { value: 'die Katze' } },
  { id: 3, prompt: 'Escolha casa.', answer: { value: 'das Haus' } },
  { id: 4, prompt: 'Escolha criança.', answer: { value: 'das Kind' } },
  { id: 5, prompt: 'Duplicado.', answer: { value: 'Der   Lehrer' } },
  { id: 6, prompt: 'Sem artigo.', answer: { value: 'Wasser' } },
  { id: 7, prompt: 'Frase longa demais.', answer: { value: 'der sehr lange und unnötig específico substantivo com muitas palavras' } },
]

test('buildArticleBlitzQueue extracts unique der die das noun cards from German session answers', () => {
  const queue = buildArticleBlitzQueue(germanItems, {
    lesson: { id: 'de-u1', language_code: 'de' },
    session: { id: 's1' },
    currentIndex: 0,
  })

  assert.equal(queue.length, 4)
  assert.deepEqual(
    queue.map((card) => ({ article: card.article, noun: card.noun, fullAnswer: card.fullAnswer })).sort((a, b) => a.fullAnswer.localeCompare(b.fullAnswer)),
    [
      { article: 'das', noun: 'Haus', fullAnswer: 'das Haus' },
      { article: 'das', noun: 'Kind', fullAnswer: 'das Kind' },
      { article: 'der', noun: 'Lehrer', fullAnswer: 'der Lehrer' },
      { article: 'die', noun: 'Katze', fullAnswer: 'die Katze' },
    ],
  )
  assert.equal(queue.every((card) => card.id && card.seed && card.prompt), true)
})

test('buildArticleBlitzQueue is German-only and requires at least four eligible cards', () => {
  assert.deepEqual(buildArticleBlitzQueue(germanItems, { lesson: { id: 'fr-u1', language_code: 'fr' }, session: { id: 's1' } }), [])
  assert.deepEqual(buildArticleBlitzQueue(germanItems.slice(0, 3), { lesson: { id: 'de-u1', language_code: 'de' }, session: { id: 's1' } }), [])
})

test('buildArticleBlitzQueue orders cards deterministically from lesson session and current index', () => {
  const first = buildArticleBlitzQueue(germanItems, { lesson: { id: 'de-u1', language_code: 'de' }, session: { id: 's1' }, currentIndex: 0 })
  const second = buildArticleBlitzQueue(germanItems, { lesson: { id: 'de-u1', language_code: 'de' }, session: { id: 's1' }, currentIndex: 0 })
  const rotated = buildArticleBlitzQueue(germanItems, { lesson: { id: 'de-u1', language_code: 'de' }, session: { id: 's1' }, currentIndex: 1 })

  assert.deepEqual(first, second)
  assert.notDeepEqual(first.map((card) => card.id), rotated.map((card) => card.id))
})

test('normalizeGermanArticle and validateArticleBlitzSelection accept only the correct article', () => {
  assert.equal(normalizeGermanArticle(' Der '), 'der')
  assert.equal(normalizeGermanArticle('dem'), '')
  assert.deepEqual(validateArticleBlitzSelection('die', { article: 'die', fullAnswer: 'die Katze' }), { status: 'correct', expected: 'die', fullAnswer: 'die Katze' })
  assert.deepEqual(validateArticleBlitzSelection('das', { article: 'die', fullAnswer: 'die Katze' }), { status: 'wrong', expected: 'die', fullAnswer: 'die Katze' })
})
