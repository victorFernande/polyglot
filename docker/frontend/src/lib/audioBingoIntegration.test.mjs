import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('Exercises renders Audio Bingo as a local 3x3 listening practice panel', () => {
  assert.match(exercisesSource, /import \{[^}]*buildAudioBingoQueue[^}]*validateAudioBingoSelection[^}]*\} from '\.\.\/lib\/audioBingo\.mjs'/s)
  assert.match(exercisesSource, /<AudioBingoPractice items=\{sessionItems\} lesson=\{lesson\} session=\{session\} currentIndex=\{currentIndex\} langCode=\{langCode\} speechPlayback=\{speechPlaybackRef\.current\} \/>/)
  assert.match(exercisesSource, /Treino local: Audio Bingo/)
  assert.match(exercisesSource, /grade 3x3/i)
  assert.match(exercisesSource, /não altera XP\/progresso/)
})

test('AudioBingoPractice keeps bingo feedback local and does not call exercise progress APIs', () => {
  const start = exercisesSource.indexOf('function AudioBingoPractice')
  assert.notEqual(start, -1)
  const end = exercisesSource.indexOf('function ArticleBlitzPractice', start)
  const componentSource = exercisesSource.slice(start, end === -1 ? undefined : end)

  assert.doesNotMatch(componentSource, /answerExerciseSession|completeExerciseSession|startExerciseSession|setSession|setSummary/)
  assert.match(componentSource, /speechPlayback\?\.speakSegments/)
  assert.match(componentSource, /validateAudioBingoSelection/)
  assert.match(componentSource, /setCorrectCount/)
  assert.match(componentSource, /grid-cols-3/)
})
