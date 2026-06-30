import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('Exercises renders Article Sorter as a German-only local bucket training panel', () => {
  assert.match(exercisesSource, /import \{[^}]*buildArticleSorterRound[^}]*validateArticleSorterBuckets[^}]*ARTICLE_SORTER_BUCKETS[^}]*\} from '\.\.\/lib\/articleSorter\.mjs'/s)
  assert.match(exercisesSource, /<ArticleSorterPractice items=\{sessionItems\} lesson=\{lesson\} session=\{session\} currentIndex=\{currentIndex\} \/>/)
  assert.match(exercisesSource, /Exercício extra: classificador de artigos/)
  assert.match(exercisesSource, /buckets der, die e das/i)
  assert.match(exercisesSource, /não altera XP\/progresso/)
})

test('ArticleSorterPractice keeps sorter feedback local and does not call exercise progress APIs', () => {
  const start = exercisesSource.indexOf('function ArticleSorterPractice')
  assert.notEqual(start, -1)
  const end = exercisesSource.indexOf('function ArticleBlitzPractice', start)
  const componentSource = exercisesSource.slice(start, end === -1 ? undefined : end)

  assert.doesNotMatch(componentSource, /answerExerciseSession|completeExerciseSession|startExerciseSession|setSession|setSummary/)
  assert.match(componentSource, /validateArticleSorterBuckets/)
  assert.match(componentSource, /setAssignments/)
  assert.match(componentSource, /ARTICLE_SORTER_BUCKETS\.map/)
  assert.match(componentSource, /Recomeçar/)
})
