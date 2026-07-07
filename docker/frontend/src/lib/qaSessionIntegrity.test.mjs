import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const qaSource = fs.readFileSync(path.join(__dirname, '../pages/ExercisesQA.jsx'), 'utf8')

test('QA session integrity strip validates rendered item against real backend session item', () => {
  assert.match(qaSource, /function QaSessionIntegrityStrip\(\{ session, item, feedback \}\)/)
  assert.match(qaSource, /const activeSessionItem = session\.items\?\.\[session\.current_index\]/)
  assert.match(qaSource, /const feedbackSessionItem = feedback\?\.answeredIndex != null \? session\.items\?\.\[feedback\.answeredIndex\] : null/)
  assert.match(qaSource, /const expectedSessionItem = feedbackSessionItem \|\| activeSessionItem/)
  assert.match(qaSource, /const hasRenderedItemMismatch = !!expectedSessionItem\?\.id && !!item\?\.id && expectedSessionItem\.id !== item\.id/)
  assert.match(qaSource, /QA BLOCKER: item renderizado não corresponde ao item real da sessão/)
})

test('QA session integrity strip keeps the 20-item real-session guard visible', () => {
  assert.match(qaSource, /const exceedsSessionLimit = session\.total_count > 20/)
  assert.match(qaSource, /QA BLOCKER: sessão com mais de 20 itens/)
  assert.match(qaSource, /Variedade:/)
  assert.doesNotMatch(qaSource, /Treino local|Questão extra|Exercício extra|frontend-only/i)
})

test('QA session integrity strip audits repeated answers from real backend session items', () => {
  assert.match(qaSource, /const answerBuckets = \(session\.items \|\| \[\]\)\.reduce/)
  assert.match(qaSource, /bucket\.itemIds\.push\(sessionItem\.id \|\| 'sem-id'\)/)
  assert.match(qaSource, /const duplicateAnswerSummary = Object\.entries\(answerBuckets\)/)
  assert.match(qaSource, /`\$\{qaDuplicateLabel\(answer\)\}: \$\{bucket\.count\}x \(\$\{bucket\.itemIds\.join\(', '\)\}\)`/)
  assert.match(qaSource, /const hasDuplicateAnswerCluster = Object\.values\(answerBuckets\)\.some\(\(bucket\) => bucket\.count > 2\)/)
  assert.match(qaSource, /QA REVISE: mesma resposta aparece mais de 2 vezes na sessão/)
  assert.match(qaSource, /Respostas repetidas:/)
})

test('QA duplicate summaries clamp long labels but keep item ids visible', () => {
  assert.match(qaSource, /function qaDuplicateLabel\(value, maxLength = 72\)/)
  assert.match(qaSource, /normalized\.length <= maxLength/)
  assert.match(qaSource, /normalized\.slice\(0, maxLength - 1\).*…/)
  assert.match(qaSource, /qaDuplicateLabel\(answer\).*bucket\.itemIds\.join/)
  assert.match(qaSource, /qaDuplicateLabel\(prompt\).*bucket\.itemIds\.join/)
})

test('QA session integrity strip audits repeated real item ids', () => {
  assert.match(qaSource, /const itemIdBuckets = \(session\.items \|\| \[\]\)\.reduce/)
  assert.match(qaSource, /const itemId = sessionItem\.id \|\| 'sem-id'/)
  assert.match(qaSource, /const duplicateItemIdSummary = Object\.entries\(itemIdBuckets\)/)
  assert.match(qaSource, /`\$\{itemId\}: \$\{bucket\.count\}x \(\$\{bucket\.types\.join\(', '\)\}\)`/)
  assert.match(qaSource, /const hasDuplicateItemIdCluster = Object\.values\(itemIdBuckets\)\.some\(\(bucket\) => bucket\.count > 1\)/)
  assert.match(qaSource, /QA REVISE: mesmo item\.id aparece mais de uma vez na sessão/)
  assert.match(qaSource, /Item IDs repetidos:/)
})

test('QA route renders listen_build with a dedicated dictation body only', () => {
  assert.match(qaSource, /const BUILD_LIKE_TYPES = \['build'\]/)
  assert.match(qaSource, /item\.type === 'listen_build' && <ListenBuildDictationExerciseBody/)
  assert.match(qaSource, /item\.type === 'build' && <BuildExerciseBody/)
  assert.doesNotMatch(qaSource, /\{BUILD_LIKE_TYPES\.includes\(item\.type\) && <BuildExerciseBody/)
  assert.match(qaSource, /if \(item\.type === 'listen_build'\) return buildListenBuildDictationPayload\(typedAnswer\)/)
  assert.match(qaSource, /if \(item\.type === 'listen_build'\) return canSubmitListenBuildDictation\(item, typedAnswer\)/)
  assert.doesNotMatch(qaSource, /const isUsingListenBuildDictation/)
  assert.match(qaSource, /const hasListenBuildDedicatedBody = item\?\.type === 'listen_build'/)
  assert.match(qaSource, /QA OK:\u003c\/strong\u003e.*listen_build usa apenas o corpo de ditado digitável/)
  assert.match(qaSource, /Renderização listen_build:/)
  assert.match(qaSource, /corpo dedicado de ditado, sem cartões de montagem/)
  assert.doesNotMatch(qaSource, /Prefiro montar com peças/)
  assert.doesNotMatch(qaSource, /use as peças abaixo/)
})

test('QA session integrity strip audits repeated prompts from real backend session items', () => {
  assert.match(qaSource, /const promptBuckets = \(session\.items \|\| \[\]\)\.reduce/)
  assert.match(qaSource, /const promptKey = String\(sessionItem\.prompt \|\| '—'\)/)
  assert.match(qaSource, /\.trim\(\)\.replace\(\/\\s\+\/g, ' '\)\.toLocaleLowerCase\(\) \|\| '—'/)
  assert.match(qaSource, /const duplicatePromptSummary = Object\.entries\(promptBuckets\)/)
  assert.match(qaSource, /`\$\{qaDuplicateLabel\(prompt\)\}: \$\{bucket\.count\}x \(\$\{bucket\.itemIds\.join\(', '\)\}\)`/)
  assert.match(qaSource, /const hasDuplicatePromptCluster = Object\.values\(promptBuckets\)\.some\(\(bucket\) => bucket\.count > 2\)/)
  assert.match(qaSource, /QA REVISE: mesmo prompt aparece mais de 2 vezes na sessão/)
  assert.match(qaSource, /Prompts repetidos:/)
})

test('QA session integrity strip uses amber chrome when only revision warnings are present', () => {
  assert.match(qaSource, /const hasIntegrityRevision = hasDuplicateItemIdCluster \|\| hasDuplicateAnswerCluster \|\| hasDuplicatePromptCluster/)
  assert.match(qaSource, /hasIntegrityBlocker \? 'border-red-400\/50 bg-red-500\/15 text-red-100' : hasIntegrityRevision \? 'border-amber-300\/40 bg-amber-400\/10 text-amber-50'/)
})

test('QA route suppresses missing active session items instead of rendering a non-session exercise', () => {
  assert.match(qaSource, /const currentSessionItem = session\?\.items\?\.\[currentIndex\]/)
  assert.match(qaSource, /const currentLessonFallbackItem = lesson\?\.items\?\.\[currentIndex\]/)
  assert.match(qaSource, /const item = feedback\?\.itemSnapshot \|\| currentSessionItem/)
  assert.match(qaSource, /const hasMissingActiveSessionItemBlocker = !!session && !currentSessionItem && currentIndex < \(session\?\.total_count \|\| 0\)/)
  assert.match(qaSource, /function QaSuppressedLessonFallbackPanel\(\{ fallbackItem, session \}\)/)
  assert.match(qaSource, /QA BLOCKER · item ativo ausente em session\.items/)
  assert.match(qaSource, /esse fallback foi suprimido para evitar prática paralela fora da sessão pontuada/)
  assert.match(qaSource, /Nenhum fallback de lesson\.items foi usado/)
  assert.doesNotMatch(qaSource, /session\?\.items\?\.length \? session\.items : \(lesson\?\.items \|\| \[\]\)/)
})
