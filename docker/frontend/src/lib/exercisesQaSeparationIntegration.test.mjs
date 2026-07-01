import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const prodSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')
const qaSource = readFileSync(new URL('../pages/ExercisesQA.jsx', import.meta.url), 'utf8')

test('QA exercise layout remains staged separately until explicit approval', () => {
  assert.match(qaSource, /<ExerciseShell[\s>]/, 'QA exercises should keep the staged shell for visual review')
  assert.match(qaSource, /Exercícios QA — novo layout/, 'QA page should remain clearly labeled')
  assert.match(qaSource, /PENDING QA APPROVAL/, 'QA page should state that promotion is still pending approval')
  assert.match(qaSource, /QA aprovado/, 'QA page should name the exact approval phrase needed for promotion')
  assert.doesNotMatch(qaSource, /Exercício extra|Treino local|Questão extra|treino não altera XP\/progresso/i, 'QA page must not expose frontend-only extra/local practice')

  assert.match(prodSource, /<ExerciseShell[\s>]/, 'production exercises should remain independently available')
  assert.doesNotMatch(prodSource, /Exercícios QA — novo layout|PENDING QA APPROVAL|Staging QA|Alterações QA pendentes|exercisesQaChangeLog|ExercisesQaChangeMenu/, 'production should not display QA staging/change-log UI')
  assert.doesNotMatch(prodSource, /COMBO x|Sair da lição|Corações restantes|Vire duas cartas|Pares corretos ficam revelados/, 'production should not keep rejected layout copy')
})
