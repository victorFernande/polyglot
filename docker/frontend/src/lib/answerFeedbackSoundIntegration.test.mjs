import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

assert.match(
  exercisesSource,
  /import \{ playAnswerFeedbackSound, unlockAnswerFeedbackSound \} from ['"]\.\.\/lib\/answerFeedbackSound\.mjs['"]/,
  'Exercises page must import helpers to unlock on click and play after feedback'
)
assert.match(
  exercisesSource,
  /unlockAnswerFeedbackSound\(\)[\s\S]*?await answerExerciseSession/,
  'checking an answer must unlock Web Audio during the user gesture before awaiting the API response'
)
assert.match(
  exercisesSource,
  /playAnswerFeedbackSound\(nextFeedback\.type\)/,
  'checking an answer must play the short correct/wrong sound from the computed feedback type'
)
assert.match(
  exercisesSource,
  /setTimeout\(\(\) => speakCurrent\(voiceSegmentsForFeedback\(nextFeedback, langCode\)\),\s*ANSWER_FEEDBACK_SPEECH_DELAY_MS\)/,
  'spoken feedback must wait for the short chime instead of masking it immediately'
)
assert.match(
  exercisesSource,
  /const ANSWER_FEEDBACK_SPEECH_DELAY_MS = 420/,
  'speech delay should leave enough time for the correct/wrong sound to be heard first'
)
