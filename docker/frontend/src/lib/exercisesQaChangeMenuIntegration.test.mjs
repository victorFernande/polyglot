import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const qaSource = readFileSync(new URL('../pages/ExercisesQA.jsx', import.meta.url), 'utf8')

test('ExercisesQA renders a top menu for QA changes and approval phrase only when pending exists', () => {
  assert.match(qaSource, /exercisesQaChangeLog/)
  assert.match(qaSource, /function ExercisesQaChangeMenu\(/)
  assert.match(qaSource, /Alterações QA/)
  assert.match(qaSource, /approvalPhrase/)
  assert.match(qaSource, /diffs\.map/)
})

test('collapsed QA change menu shows a clear zero-pending state after approvals', () => {
  assert.match(qaSource, /Nenhuma alteração QA pendente/)
  assert.match(qaSource, /Todas as alterações listadas foram aprovadas/)
  assert.match(qaSource, /pendingChanges\.length === 0/)
})

test('collapsed QA change menu shows the exact latest approval phrase only when a pending item exists', () => {
  assert.match(qaSource, /Próxima aprovação:/)
  assert.match(qaSource, /latestChange\?\.approvalPhrase/)
})

test('ExercisesQA header avoids noisy scope badges outside the pending-change menu', () => {
  assert.doesNotMatch(qaSource, /Rota \/exercises-qa|Produção \/exercises intacta|Sessões reais pontuadas/)
})
