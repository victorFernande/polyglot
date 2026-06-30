import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('Exercises renders article blitz as a German-only local optional training panel', () => {
  assert.match(exercisesSource, /import \{[^}]*buildArticleBlitzQueue[^}]*validateArticleBlitzSelection[^}]*ARTICLE_BLITZ_OPTIONS[^}]*\} from '\.\.\/lib\/articleBlitz\.mjs'/s)
  assert.match(exercisesSource, /Treino local: artigo relâmpago/)
  assert.match(exercisesSource, /não altera XP\/progresso/)
  assert.match(exercisesSource, /der.*die.*das/s)
})

test('ArticleBlitzPractice receives session items without progress-changing callbacks', () => {
  assert.match(exercisesSource, /<ArticleBlitzPractice\s+items=\{sessionItems\}\s+lesson=\{lesson\}\s+session=\{session\}\s+currentIndex=\{currentIndex\}/)
  assert.doesNotMatch(exercisesSource, /<ArticleBlitzPractice[^>]*(answerExerciseSession|completeExerciseSession|startExerciseSession|setSession|setSummary)/s)
})
