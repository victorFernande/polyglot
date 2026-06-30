import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const exercisesSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

assert.match(
  exercisesSource,
  /import \{ playSessionCompletionFanfare, unlockSessionCompletionFanfare \} from ['"]\.\.\/lib\/sessionCompletionFanfare\.mjs['"]/,
  'Exercises page must import session completion fanfare helpers'
)
assert.match(
  exercisesSource,
  /if \(session\?\.current_index >= session\?\.total_count\) \{\s*unlockSessionCompletionFanfare\(\)\s*await finish\(true\)\s*return\s*\}/,
  'advancing after the final question must unlock the fanfare during the user click before async completion work'
)
assert.match(
  exercisesSource,
  /if \(continueNext\) \{\s*playSessionCompletionFanfare\(\)/,
  'finishing a session and continuing to the next session must play the victory fanfare'
)
assert.match(
  exercisesSource,
  /playSessionCompletionFanfare\(\)[\s\S]*?startExerciseSession/,
  'the victory fanfare should start before the next session is loaded'
)
