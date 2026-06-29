import assert from 'node:assert/strict'
import { filterExerciseLessonsByLanguage } from './exerciseLessonFilters.mjs'

const lessons = [
  { id: 1, language_code: 'de', language_name: 'Alemão' },
  { id: 2, language: 'fr', language_name: 'Francês' },
  { id: 3, language_code: 'ru', language_name: 'Russo' },
  { id: 4, language: 'jp', language_name: 'Japonês' },
  { id: 5, language_code: 'en', language_name: 'Inglês' },
]

assert.deepEqual(
  filterExerciseLessonsByLanguage(lessons, 'all').map((lesson) => lesson.id),
  [1, 2, 3, 4, 5],
  'the all filter should preserve the current complete lesson grid'
)

assert.deepEqual(
  filterExerciseLessonsByLanguage(lessons, 'fr').map((lesson) => lesson.id),
  [2],
  'language filtering should accept lessons that use language instead of language_code'
)

assert.deepEqual(
  filterExerciseLessonsByLanguage(lessons, 'de').map((lesson) => lesson.id),
  [1],
  'language filtering should prefer language_code when present'
)

assert.deepEqual(
  filterExerciseLessonsByLanguage(null, 'de'),
  [],
  'missing lesson data should render as an empty safe grid'
)

assert.equal(
  filterExerciseLessonsByLanguage(lessons, 'all'),
  lessons,
  'the all filter should return the original array so it does not reorder or clone cards unnecessarily'
)
