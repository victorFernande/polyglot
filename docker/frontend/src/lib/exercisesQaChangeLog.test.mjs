import assert from 'node:assert/strict'
import test from 'node:test'

import { exercisesQaChangeLog, latestExercisesQaChange, pendingExercisesQaChanges } from './exercisesQaChangeLog.mjs'

test('approved 30/06 18:00 QA change is no longer pending', () => {
  const approved = exercisesQaChangeLog.find((entry) => entry.approvalPhrase === 'qa aprovado 30/06 18:00')
  assert.ok(approved, 'approved QA entry should stay recorded for audit')
  assert.equal(approved.approved, true)
  assert.doesNotMatch(approved.summary, /produção/i, 'QA chrome approval must not imply production promotion')
})

test('QA changelog does not keep removed stale scope-badge changes pending', () => {
  const pendingText = pendingExercisesQaChanges().flatMap((entry) => [entry.title, entry.summary, ...entry.diffs]).join('\n')
  assert.doesNotMatch(pendingText, /Rota \/exercises-qa|Produção \/exercises intacta|Sessões reais pontuadas|Badges de escopo/)
})

test('QA session integrity strip has a pending changelog entry', () => {
  const entry = exercisesQaChangeLog.find((change) => change.id === '2026-06-30-1911-qa-session-integrity-strip')
  assert.ok(entry, 'visible QA-only session integrity strip must be recorded')
  assert.equal(entry.approved, false)
  assert.equal(entry.timestamp, '30/06 19:11')
  assert.equal(entry.approvalPhrase, 'qa aprovado 30/06 19:11')
  assert.match(entry.summary, /metadados da sessão backend/)
  assert.ok(entry.diffs.some((diff) => /20 itens/.test(diff)))
  assert.ok(entry.diffs.some((diff) => /Variedade/.test(diff)))
})

test('latestExercisesQaChange returns null when every entry is approved', () => {
  const entries = [
    { id: 'approved-a', approved: true },
    { id: 'approved-b', approved: true },
  ]
  assert.equal(latestExercisesQaChange(entries), null)
})

test('pendingExercisesQaChanges returns only unapproved entries', () => {
  const entries = [
    { id: 'approved', approved: true },
    { id: 'pending', approved: false },
  ]
  assert.deepEqual(pendingExercisesQaChanges(entries).map((entry) => entry.id), ['pending'])
})

test('collapsed approval phrase visibility has a pending changelog entry', () => {
  const entry = exercisesQaChangeLog.find((change) => change.id === '2026-06-30-2011-qa-collapsed-approval-phrase')
  assert.ok(entry, 'visible QA-only collapsed approval phrase must be recorded')
  assert.equal(entry.approved, false)
  assert.equal(entry.timestamp, '30/06 20:11')
  assert.equal(entry.approvalPhrase, 'QA aprovado 30/06 20:11')
  assert.match(entry.summary, /frase exata de aprovação/)
  assert.ok(entry.diffs.some((diff) => /Próxima aprovação/.test(diff)))
})

test('active item window QA blocker has a pending changelog entry', () => {
  const entry = exercisesQaChangeLog.find((change) => change.id === '2026-06-30-2111-qa-active-item-window-audit')
  assert.ok(entry, 'visible QA-only active item window audit must be recorded')
  assert.equal(entry.approved, false)
  assert.equal(entry.timestamp, '30/06 21:11')
  assert.equal(entry.approvalPhrase, 'QA aprovado 30/06 21:11')
  assert.match(entry.summary, /current_index/)
  assert.ok(entry.diffs.some((diff) => /item.id/.test(diff)))
  assert.ok(entry.diffs.some((diff) => /current_index sem item real/.test(diff)))
})

test('latestExercisesQaChange returns the newest pending QA entry', () => {
  const latest = latestExercisesQaChange()
  assert.equal(latest.id, '2026-06-30-2111-qa-active-item-window-audit')
  assert.equal(latest.approvalPhrase, 'QA aprovado 30/06 21:11')
})
