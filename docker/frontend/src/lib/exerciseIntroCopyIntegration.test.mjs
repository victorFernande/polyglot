import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const prodSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')
const qaSource = readFileSync(new URL('../pages/ExercisesQA.jsx', import.meta.url), 'utf8')

test('exercise pages do not show verbose curriculum/session-count intro copy', () => {
  const forbiddenCopy = /1000 questões por idioma|10 unidades situacionais|10 tópicos por unidade|Cada sessão continua com 10 perguntas|Sessões reais pontuadas, com no máximo 20 perguntas por sessão/
  assert.doesNotMatch(prodSource, forbiddenCopy)
  assert.doesNotMatch(qaSource, forbiddenCopy)
})
