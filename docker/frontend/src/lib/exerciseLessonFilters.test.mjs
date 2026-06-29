import assert from 'node:assert/strict'
import { filterExerciseLessonsByLanguage, summarizeExerciseLessonProgressByLanguage } from './exerciseLessonFilters.mjs'

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

const lessonsWithProgress = [
  { id: 10, language_code: 'de', completed_sessions: 2, total_sessions: 5 },
  { id: 11, language: 'de', completed_sessions: 1, total_sessions: 5 },
  { id: 12, language_code: 'fr', completed_sessions: 3, total_sessions: 10 },
  { id: 13, language_code: 'ru' },
]

assert.deepEqual(
  summarizeExerciseLessonProgressByLanguage(lessonsWithProgress),
  {
    all: { completed: 6, total: 20, label: '6/20 sessões' },
    de: { completed: 3, total: 10, label: '3/10 sessões' },
    fr: { completed: 3, total: 10, label: '3/10 sessões' },
    ru: { completed: 0, total: 0, label: '0/0 sessões' },
  },
  'language progress summaries should aggregate lesson session counts and use safe defaults'
)
