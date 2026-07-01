import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const prodSource = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')
const qaSource = readFileSync(new URL('../pages/ExercisesQA.jsx', import.meta.url), 'utf8')

test('QA exercise layout remains staged separately until explicit approval', () => {
  assert.match(qaSource, /<ExerciseShell[\s>]/, 'QA exercises should keep the staged shell for visual review')
  assert.match(qaSource, /Exercícios QA — novo layout/, 'QA page should remain clearly labeled')
  assert.match(qaSource, /QA separado de produção/, 'QA page should state that the route remains separate from production')
  assert.doesNotMatch(qaSource, /PENDING QA APPROVAL|item pendente|alterações pendentes/i, 'approved QA page must not look like it still has pending approvals')
  assert.doesNotMatch(qaSource, /Exercício extra|Treino local|Questão extra|treino não altera XP\/progresso/i, 'QA page must not expose frontend-only extra/local practice')

  assert.match(prodSource, /<ExerciseShell[\s>]/, 'production exercises should remain independently available')
  assert.doesNotMatch(prodSource, /Exercícios QA — novo layout|PENDING QA APPROVAL|Staging QA|Alterações QA pendentes|exercisesQaChangeLog|ExercisesQaChangeMenu/, 'production should not display QA staging/change-log UI')
  assert.doesNotMatch(prodSource, /COMBO x|Sair da lição|Corações restantes|Vire duas cartas|Pares corretos ficam revelados/, 'production should not keep rejected layout copy')
})
