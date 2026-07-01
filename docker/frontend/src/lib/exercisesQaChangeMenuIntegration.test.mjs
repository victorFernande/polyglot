import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const qaSource = readFileSync(new URL('../pages/ExercisesQA.jsx', import.meta.url), 'utf8')

test('ExercisesQA renders a top menu for pending QA changes and approval phrase', () => {
  assert.match(qaSource, /exercisesQaChangeLog/)
  assert.match(qaSource, /function ExercisesQaChangeMenu\(/)
  assert.match(qaSource, /Alterações QA pendentes/)
  assert.match(qaSource, /approvalPhrase/)
  assert.match(qaSource, /diffs\.map/)
})

test('collapsed QA change menu shows the exact latest approval phrase before opening', () => {
  assert.match(qaSource, /Próxima aprovação:/)
  assert.match(qaSource, /latestChange\.approvalPhrase/)
})

test('ExercisesQA header avoids noisy scope badges outside the pending-change menu', () => {
  assert.doesNotMatch(qaSource, /Rota \/exercises-qa|Produção \/exercises intacta|Sessões reais pontuadas/)
})
