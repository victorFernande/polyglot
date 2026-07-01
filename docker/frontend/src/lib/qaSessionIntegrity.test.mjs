import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const qaSource = fs.readFileSync(path.join(__dirname, '../pages/ExercisesQA.jsx'), 'utf8')

test('QA session integrity strip validates rendered item against real backend session item', () => {
  assert.match(qaSource, /function QaSessionIntegrityStrip\(\{ session, item, feedback \}\)/)
  assert.match(qaSource, /const activeSessionItem = session\.items\?\.\[session\.current_index\]/)
  assert.match(qaSource, /const feedbackSessionItem = feedback\?\.answeredIndex != null \? session\.items\?\.\[feedback\.answeredIndex\] : null/)
  assert.match(qaSource, /const expectedSessionItem = feedbackSessionItem \|\| activeSessionItem/)
  assert.match(qaSource, /const hasRenderedItemMismatch = !!expectedSessionItem\?\.id && !!item\?\.id && expectedSessionItem\.id !== item\.id/)
  assert.match(qaSource, /QA BLOCKER: item renderizado não corresponde ao item real da sessão/)
})

test('QA session integrity strip keeps the 20-item real-session guard visible', () => {
  assert.match(qaSource, /const exceedsSessionLimit = session\.total_count > 20/)
  assert.match(qaSource, /QA BLOCKER: sessão com mais de 20 itens/)
  assert.match(qaSource, /Variedade:/)
  assert.doesNotMatch(qaSource, /Treino local|Questão extra|Exercício extra|frontend-only/i)
})

test('QA session integrity strip audits repeated answers from real backend session items', () => {
  assert.match(qaSource, /const answerBuckets = \(session\.items \|\| \[\]\)\.reduce/)
  assert.match(qaSource, /bucket\.itemIds\.push\(sessionItem\.id \|\| 'sem-id'\)/)
  assert.match(qaSource, /const duplicateAnswerSummary = Object\.entries\(answerBuckets\)/)
  assert.match(qaSource, /`\$\{answer\}: \$\{bucket\.count\}x \(\$\{bucket\.itemIds\.join\(', '\)\}\)`/)
  assert.match(qaSource, /const hasDuplicateAnswerCluster = Object\.values\(answerBuckets\)\.some\(\(bucket\) => bucket\.count > 2\)/)
  assert.match(qaSource, /QA REVISE: mesma resposta aparece mais de 2 vezes na sessão/)
  assert.match(qaSource, /Respostas repetidas:/)
})

test('QA route suppresses lesson item fallback instead of rendering a non-session exercise', () => {
  assert.match(qaSource, /const currentSessionItem = session\?\.items\?\.\[currentIndex\]/)
  assert.match(qaSource, /const currentLessonFallbackItem = lesson\?\.items\?\.\[currentIndex\]/)
  assert.match(qaSource, /const item = feedback\?\.itemSnapshot \|\| currentSessionItem/)
  assert.match(qaSource, /hasSuppressedLessonItemFallback/)
  assert.match(qaSource, /function QaSuppressedLessonFallbackPanel\(\{ fallbackItem, session \}\)/)
  assert.match(qaSource, /QA BLOCKER · fallback de lesson\.items suprimido/)
  assert.match(qaSource, /não renderizou esse fallback para evitar prática paralela fora da sessão pontuada/)
  assert.doesNotMatch(qaSource, /session\?\.items\?\.length \? session\.items : \(lesson\?\.items \|\| \[\]\)/)
})
