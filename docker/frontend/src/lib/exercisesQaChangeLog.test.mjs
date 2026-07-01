import assert from 'node:assert/strict'
import test from 'node:test'

import { exercisesQaChangeLog, latestExercisesQaChange, pendingExercisesQaChanges } from './exercisesQaChangeLog.mjs'

const approvedPhrases = [
  'qa aprovado 30/06 18:00',
  'qa aprovado 30/06 19:11',
  'QA aprovado 30/06 20:02',
  'QA aprovado 30/06 20:11',
  'QA aprovado 30/06 21:02',
  'QA aprovado 30/06 21:11',
  'QA aprovado 30/06 22:02',
  'QA aprovado 30/06 23:02',
  'QA aprovado 01/07 10:02',
  'QA aprovado 01/07 14:02',
  'QA aprovado 01/07 16:01',
  'QA aprovado 01/07 17:02',
  'QA aprovado 01/07 18:02',
]

test('all reviewed QA changelog entries are approved and retained for audit', () => {
  for (const phrase of approvedPhrases) {
    const entry = exercisesQaChangeLog.find((change) => change.approvalPhrase === phrase)
    assert.ok(entry, `${phrase} should stay recorded for audit`)
    assert.equal(entry.approved, true)
  }
})

test('approving QA chrome does not imply production promotion', () => {
  const qaText = exercisesQaChangeLog.flatMap((entry) => [entry.title, entry.summary, ...entry.diffs]).join('\n')

  assert.match(qaText, /\/exercises-qa/)
  assert.match(qaText, /produção \/exercises permanecem|produção \/exercises não recebe/i)
})

test('QA changelog does not keep removed stale scope-badge changes pending', () => {
  const pendingText = pendingExercisesQaChanges().flatMap((entry) => [entry.title, entry.summary, ...entry.diffs]).join('\n')
  assert.doesNotMatch(pendingText, /Rota \/exercises-qa|Produção \/exercises intacta|Sessões reais pontuadas|Badges de escopo/)
})

test('session integrity strip entry is approved with original evidence', () => {
  const entry = exercisesQaChangeLog.find((change) => change.id === '2026-06-30-1911-qa-session-integrity-strip')
  assert.ok(entry, 'visible QA-only session integrity strip must be recorded')
  assert.equal(entry.approved, true)
  assert.equal(entry.timestamp, '30/06 19:11')
  assert.equal(entry.approvalPhrase, 'qa aprovado 30/06 19:11')
  assert.match(entry.summary, /metadados da sessão backend/)
  assert.ok(entry.diffs.some((diff) => /20 itens/.test(diff)))
  assert.ok(entry.diffs.some((diff) => /Variedade/.test(diff)))
})

test('collapsed approval phrase entry is approved with original evidence', () => {
  const entry = exercisesQaChangeLog.find((change) => change.id === '2026-06-30-2011-qa-collapsed-approval-phrase')
  assert.ok(entry, 'visible QA-only collapsed approval phrase must be recorded')
  assert.equal(entry.approved, true)
  assert.equal(entry.timestamp, '30/06 20:11')
  assert.equal(entry.approvalPhrase, 'QA aprovado 30/06 20:11')
  assert.match(entry.summary, /frase exata de aprovação/)
  assert.ok(entry.diffs.some((diff) => /Próxima aprovação/.test(diff)))
})

test('active item window audit entry is approved with original evidence', () => {
  const entry = exercisesQaChangeLog.find((change) => change.id === '2026-06-30-2111-qa-active-item-window-audit')
  assert.ok(entry, 'visible QA-only active item window audit must be recorded')
  assert.equal(entry.approved, true)
  assert.equal(entry.timestamp, '30/06 21:11')
  assert.equal(entry.approvalPhrase, 'QA aprovado 30/06 21:11')
  assert.match(entry.summary, /current_index/)
  assert.ok(entry.diffs.some((diff) => /item.id/.test(diff)))
  assert.ok(entry.diffs.some((diff) => /current_index sem item real/.test(diff)))
})

test('finish window integrity state entry is approved with original evidence', () => {
  const entry = exercisesQaChangeLog.find((change) => change.id === '2026-06-30-2202-qa-finish-window-integrity-state')
  assert.ok(entry, 'visible QA-only finish-window integrity state must be recorded')
  assert.equal(entry.approved, true)
  assert.equal(entry.timestamp, '30/06 22:02')
  assert.equal(entry.approvalPhrase, 'QA aprovado 30/06 22:02')
  assert.match(entry.summary, /fim aguardando conclusão/)
  assert.ok(entry.diffs.some((diff) => /janela ativa: fim aguardando conclusão/.test(diff)))
  assert.ok(entry.diffs.some((diff) => /current_index sem item real/.test(diff)))
})

test('rendered-item source audit entry is approved with original evidence', () => {
  const entry = exercisesQaChangeLog.find((change) => change.id === '2026-06-30-2302-qa-rendered-item-source-audit')

  assert.ok(entry, 'visible QA-only rendered-item source audit must be recorded')
  assert.equal(entry.approved, true)
  assert.equal(entry.timestamp, '30/06 23:02')
  assert.equal(entry.approvalPhrase, 'QA aprovado 30/06 23:02')
  assert.match(entry.summary, /fallback local\/lesson\.items/)
})

test('approved QA changelog copy does not still say changes are pending', () => {
  const approvedText = exercisesQaChangeLog
    .filter((entry) => entry.approved)
    .flatMap((entry) => [entry.title, entry.summary, ...entry.diffs])
    .join('\n')

  assert.doesNotMatch(approvedText, /alterações pendentes|item pendente|pendente mais novo|menu de alterações pendentes|PENDING QA APPROVAL/i)
})

test('rendered-item source audit fix entry is approved and retained for audit', () => {
  const entry = exercisesQaChangeLog.find((change) => change.id === '2026-07-01-1002-qa-rendered-item-source-audit-fix')

  assert.ok(entry, 'visible QA-only rendered-item source audit fix must be recorded')
  assert.equal(entry.approved, true)
  assert.equal(entry.timestamp, '01/07 10:02')
  assert.equal(entry.approvalPhrase, 'QA aprovado 01/07 10:02')
  assert.match(entry.summary, /snapshot de feedback/)
})

test('all open QA changes are approved and no pending changelog item remains', () => {
  assert.deepEqual(pendingExercisesQaChanges().map((entry) => entry.approvalPhrase), [])
  assert.equal(latestExercisesQaChange(), null)
})

test('lesson item fallback suppression QA entry is approved with scoped evidence', () => {
  const entry = exercisesQaChangeLog.find((change) => change.id === '2026-07-01-1402-qa-suppress-lesson-item-fallback')

  assert.ok(entry, 'visible QA-only lesson fallback suppression must be recorded')
  assert.equal(entry.approved, true)
  assert.equal(entry.timestamp, '01/07 14:02')
  assert.equal(entry.approvalPhrase, 'QA aprovado 01/07 14:02')
  assert.match(entry.summary, /lesson\.items/)
})

test('live approvals banner QA entry is approved with scoped evidence', () => {
  const entry = exercisesQaChangeLog.find((change) => change.id === '2026-07-01-1601-qa-separation-banner-live-approvals')

  assert.ok(entry, 'visible QA-only live approvals banner must be recorded')
  assert.equal(entry.approved, true)
  assert.equal(entry.timestamp, '01/07 16:01')
  assert.equal(entry.approvalPhrase, 'QA aprovado 01/07 16:01')
  assert.match(entry.summary, /banner/)
})

test('repeated-answer QA audit is approved with scoped evidence', () => {
  const entry = exercisesQaChangeLog.find((change) => change.id === '2026-07-01-1702-qa-repeated-answer-audit')

  assert.ok(entry, 'visible QA-only repeated-answer audit must be recorded')
  assert.equal(entry.approved, true)
  assert.equal(entry.timestamp, '01/07 17:02')
  assert.equal(entry.approvalPhrase, 'QA aprovado 01/07 17:02')
  assert.match(entry.summary, /respostas repetidas/)
  assert.ok(entry.diffs.some((diff) => /session\.items reais/.test(diff)))
  assert.ok(entry.diffs.some((diff) => /produção \/exercises permanecem inalterados/.test(diff)))
})

test('repeated-answer item id QA audit is approved with scoped evidence', () => {
  const entry = exercisesQaChangeLog.find((change) => change.id === '2026-07-01-1802-qa-repeated-answer-item-ids')

  assert.ok(entry, 'visible QA-only repeated-answer item id audit must be recorded')
  assert.equal(entry.approved, true)
  assert.equal(entry.timestamp, '01/07 18:02')
  assert.equal(entry.approvalPhrase, 'QA aprovado 01/07 18:02')
  assert.match(entry.summary, /item\.id/)
  assert.ok(entry.diffs.some((diff) => /session\.items reais/.test(diff)))
  assert.ok(entry.diffs.some((diff) => /produção \/exercises permanecem inalterados/.test(diff)))
})

test('changelog copy avoids stale raw PENDING QA APPROVAL wording even for unapproved entries', () => {
  const allText = exercisesQaChangeLog.flatMap((entry) => [entry.title, entry.summary, ...entry.diffs]).join('\n')

  assert.doesNotMatch(allText, /PENDING QA APPROVAL/)
})

test('pendingExercisesQaChanges still returns only unapproved entries for custom lists', () => {
  const entries = [
    { id: 'approved', approved: true },
    { id: 'pending', approved: false },
  ]
  assert.deepEqual(pendingExercisesQaChanges(entries).map((entry) => entry.id), ['pending'])
})
