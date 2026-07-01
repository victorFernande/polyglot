import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('exercise page must not expose frontend-only extra/local practice blocks', () => {
  assert.doesNotMatch(exercisesSource, /<QuestionModeSwitcher/, 'Do not add a Questão/Questão extra selector menu')
  assert.doesNotMatch(exercisesSource, /activeLocalPracticeIndex/, 'Extra practice should not be separate frontend mode state')
  assert.doesNotMatch(exercisesSource, /<LocalPracticeCarousel/, 'Do not render a carousel panel under the active question')
  assert.doesNotMatch(exercisesSource, /<LocalPracticeQuestionFrame/, 'Do not wrap extras as a parallel question view')
  assert.doesNotMatch(exercisesSource, /Exercício extra/i, 'Never render frontend-only Exercício extra panels')
  assert.doesNotMatch(exercisesSource, /treino não altera XP\/progresso/i, 'Never render unscored local practice inside sessions')
  assert.doesNotMatch(exercisesSource, /ChunkBuilderPractice|TypingRushPractice|WordScramblePractice|AudioABPractice|AudioBingoPractice|ArticleSorterPractice|ArticleBlitzPractice|ErrorSpotterPractice|ClozeRushPractice|OrthographyRepairPractice|DialogueReactionPractice|WordSearchPractice|LetterBlocksPractice/, 'Local practice components must not live on the Exercises page')
})
