import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('Exercises page does not mount frontend-only local practice panels', () => {
  assert.doesNotMatch(exercisesSource, /Exercício extra/i)
  assert.doesNotMatch(exercisesSource, /treino não altera XP\/progresso/i)
  assert.doesNotMatch(exercisesSource, /ChunkBuilderPractice|TypingRushPractice|WordScramblePractice|AudioABPractice|AudioBingoPractice|ArticleSorterPractice|ArticleBlitzPractice|ErrorSpotterPractice|ClozeRushPractice|OrthographyRepairPractice|DialogueReactionPractice|WordSearchPractice|LetterBlocksPractice/)
})
