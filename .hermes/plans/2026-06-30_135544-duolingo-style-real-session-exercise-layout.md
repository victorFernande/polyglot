# Duolingo-style Real Session Exercise Layout Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task only after Victor explicitly approves with yes/no. Do not implement from this plan until approval is given.

**Goal:** Redesign Polyglot's real session exercise UI so different exercise types use a polished Duolingo-like layout, while staying inside the normal scored session flow.

**Architecture:** Keep all exercises as backend session items returned by `ExerciseSessionResponse.items`; do not add frontend-only/local/extra practice panels. Extract reusable frontend layout primitives for top progress, exercise body, answer surface, and bottom feedback/action sheet. Render different item types through type-specific real-session components that submit through the existing `answerExerciseSession` flow.

**Tech Stack:** React + Vite frontend in `docker/frontend`, FastAPI/SQLite backend in `docker/backend`, Node `node:test` tests, pytest backend tests.

---

## Non-negotiable boundaries

1. **No new feature implementation before Victor approves yes/no.** This file is only a plan.
2. **No `Exercício extra`, `Treino local`, `Questão extra`, `treino não altera XP/progresso`, local practice panels, secondary carousels, or parallel modes.**
3. Every varied exercise must be a **real scored backend session item**.
4. Session cap remains **max 20 questions/session**; additional items grow sessions.
5. Preserve the existing regression `docker/frontend/src/lib/localPracticeCarouselIntegration.test.mjs` and make it stricter if needed.
6. Use disposable users for live probes. Never advance Victor's real progress for testing.

---

## Current context

Relevant existing files:

- Main exercise page: `docker/frontend/src/pages/Exercises.jsx`
- Backend exercise service: `docker/backend/services.py`
- Backend exercise API: `docker/backend/main.py`
- Backend content tests: `docker/backend/test_exercise_content.py`
- Backend session/API tests: `docker/backend/test_exercises_api.py`
- Frontend no-extra regression: `docker/frontend/src/lib/localPracticeCarouselIntegration.test.mjs`
- Existing frontend helpers:
  - `docker/frontend/src/lib/exerciseTrailLayout.mjs`
  - `docker/frontend/src/lib/exerciseSessionLabels.mjs`
  - `docker/frontend/src/lib/exerciseFeedback.mjs`
  - `docker/frontend/src/lib/answerFeedbackSound.mjs`
  - `docker/frontend/src/lib/sessionCompletionFanfare.mjs`
  - `docker/frontend/src/lib/imageChoice.mjs`
  - `docker/frontend/src/lib/buildWordOrder.mjs`
  - `docker/frontend/src/lib/sequenceDialogue.mjs`
  - `docker/frontend/src/lib/listenBuildDictation.mjs`

Reference layout from image:

- Top: close button, progress bar, combo/resource indicator.
- Center: difficulty label, short instruction, character/speech bubble or type-specific prompt area.
- Answer surface: large input/choice/build area with clear selected/correct/wrong visual state.
- Bottom: feedback sheet with status, optional explanation button, and large continue button.

---

## Proposed approach

Implement the redesign in layers:

1. Add pure helper functions for layout labels, progress state, and feedback state.
2. Add regression tests that prove no extra/local panels can return.
3. Extract a reusable `ExerciseShell` component from `Exercises.jsx`.
4. Extract type-specific body components for existing real session item types only.
5. Move feedback into a Duolingo-like bottom sheet, still using existing answer/continue logic.
6. Add optional “Explique minha resposta” UI using existing explanation data, without new backend feature unless approved separately.
7. Validate with full frontend tests, backend tests, build, Docker deploy, and disposable-user live probe.

---

## Task 1: Add a layout contract test for the new shell

**Objective:** Lock the intended architecture before changing production UI.

**Files:**
- Create: `docker/frontend/src/lib/exerciseLayoutContract.test.mjs`
- Modify: none initially

**Step 1: Write failing test**

Create a static test that requires the future `Exercises.jsx` to use named layout regions and forbids extra panels.

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../pages/Exercises.jsx', import.meta.url), 'utf8')

test('Exercises uses one real-session shell instead of extra/local panels', () => {
  assert.match(source, /ExerciseShell/, 'real session layout shell should exist')
  assert.match(source, /ExerciseFeedbackSheet/, 'feedback should live in a bottom sheet region')
  assert.doesNotMatch(source, /Exercício extra|Treino local|Questão extra|treino não altera XP\/progresso/i)
  assert.doesNotMatch(source, /LocalPractice|Practice\s*\(/, 'no parallel local practice components on Exercises page')
})
```

**Step 2: Run test to verify failure**

Run:

```bash
cd /home/victor/workspace/polyglot/docker/frontend
node src/lib/exerciseLayoutContract.test.mjs
```

Expected: FAIL because `ExerciseShell` and `ExerciseFeedbackSheet` do not exist yet.

**Step 3:** Do not implement yet. Proceed to Task 2 after approval/execution begins.

---

## Task 2: Add helper tests for layout metadata

**Objective:** Define labels and state mapping without touching the page.

**Files:**
- Create: `docker/frontend/src/lib/exerciseLayoutState.mjs`
- Create: `docker/frontend/src/lib/exerciseLayoutState.test.mjs`

**Step 1: Write failing tests**

Test pure helpers:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  difficultyLabelForItem,
  instructionForItemType,
  feedbackToneForResult,
  progressPercentForSession,
} from './exerciseLayoutState.mjs'

test('instructionForItemType returns short commands for varied real session items', () => {
  assert.equal(instructionForItemType({ type: 'choice' }), 'Escolha a resposta correta:')
  assert.equal(instructionForItemType({ type: 'listen_choice' }), 'Ouça e escolha:')
  assert.equal(instructionForItemType({ type: 'image_choice' }), 'Observe e escolha:')
  assert.equal(instructionForItemType({ type: 'build' }), 'Monte a frase:')
  assert.equal(instructionForItemType({ type: 'listen_build' }), 'Ouça e monte:')
  assert.equal(instructionForItemType({ type: 'sequence_dialogue' }), 'Ordene o diálogo:')
  assert.equal(instructionForItemType({ type: 'match' }), 'Relacione os pares:')
})

test('progressPercentForSession clamps current session progress', () => {
  assert.equal(progressPercentForSession({ current_index: 0, total_count: 20 }), 0)
  assert.equal(progressPercentForSession({ current_index: 10, total_count: 20 }), 50)
  assert.equal(progressPercentForSession({ current_index: 25, total_count: 20 }), 100)
})

test('feedbackToneForResult maps answer states to semantic UI tones', () => {
  assert.equal(feedbackToneForResult(null), 'idle')
  assert.equal(feedbackToneForResult({ type: 'correct' }), 'correct')
  assert.equal(feedbackToneForResult({ type: 'wrong' }), 'wrong')
})

test('difficultyLabelForItem returns optional harder label without creating new exercise modes', () => {
  assert.equal(difficultyLabelForItem({ type: 'sequence_dialogue' }), 'MAIS DIFÍCIL')
  assert.equal(difficultyLabelForItem({ type: 'choice' }), '')
})
```

**Step 2: Run test to verify failure**

```bash
cd /home/victor/workspace/polyglot/docker/frontend
node src/lib/exerciseLayoutState.test.mjs
```

Expected: FAIL because helper file does not exist.

**Step 3: Minimal implementation**

```js
export function instructionForItemType(item = {}) {
  const byType = {
    choice: 'Escolha a resposta correta:',
    listen_choice: 'Ouça e escolha:',
    context_choice: 'Escolha a melhor resposta:',
    image_choice: 'Observe e escolha:',
    build: 'Monte a frase:',
    listen_build: 'Ouça e monte:',
    sequence_dialogue: 'Ordene o diálogo:',
    match: 'Relacione os pares:',
  }
  return byType[item.type] || 'Responda:'
}

export function progressPercentForSession(session = {}) {
  const total = Math.max(1, Number(session.total_count || 0))
  const current = Math.max(0, Number(session.current_index || 0))
  return Math.min(100, Math.round((current / total) * 100))
}

export function feedbackToneForResult(feedback) {
  if (!feedback) return 'idle'
  return feedback.type === 'correct' ? 'correct' : 'wrong'
}

export function difficultyLabelForItem(item = {}) {
  return ['build', 'listen_build', 'sequence_dialogue', 'match'].includes(item.type) ? 'MAIS DIFÍCIL' : ''
}
```

**Step 4: Run test to verify pass**

```bash
node src/lib/exerciseLayoutState.test.mjs
```

Expected: PASS.

---

## Task 3: Extract `ExerciseFeedbackSheet`

**Objective:** Move feedback into a reusable bottom sheet while preserving existing behavior.

**Files:**
- Modify: `docker/frontend/src/pages/Exercises.jsx`
- Test: `docker/frontend/src/lib/exerciseLayoutContract.test.mjs`
- Test: existing `docker/frontend/src/lib/exerciseFeedback.test.mjs`

**Design:**

`ExerciseFeedbackSheet` should accept:

```js
function ExerciseFeedbackSheet({
  feedback,
  session,
  onExplain,
  onRepeatAnswer,
  onContinue,
  onFinish,
})
```

Behavior:

- Hidden when no feedback.
- Correct state: green panel, check icon, short success copy (`Incrível!` or `Correto!`).
- Wrong state: red panel, correction detail, explanation visible.
- Primary button remains existing next/finish behavior.
- Secondary `EXPLIQUE MINHA RESPOSTA` opens explanation text if available; no backend call in this phase.

**Step 1: Write/adjust failing test**

Extend `exerciseLayoutContract.test.mjs`:

```js
assert.match(source, /function ExerciseFeedbackSheet\(/)
assert.match(source, /EXPLIQUE MINHA RESPOSTA|Explicação/)
```

**Step 2: Run test**

```bash
node src/lib/exerciseLayoutContract.test.mjs
```

Expected: FAIL until component exists.

**Step 3: Implement by moving existing feedback markup**

Keep existing `feedback?.type === 'wrong'`, `readableAnswer`, `nextExerciseActionLabel(session)`, `finish(true)`, and `next` logic. Do not change answer validation.

**Step 4: Run targeted tests**

```bash
node src/lib/exerciseLayoutContract.test.mjs
node src/lib/exerciseFeedback.test.mjs
```

Expected: PASS.

---

## Task 4: Extract `ExerciseShell` for top/progress/central layout

**Objective:** Create a single shell for all real session exercises.

**Files:**
- Modify: `docker/frontend/src/pages/Exercises.jsx`
- Import: `progressPercentForSession`, `instructionForItemType`, `difficultyLabelForItem` from `../lib/exerciseLayoutState.mjs`
- Test: `docker/frontend/src/lib/exerciseLayoutContract.test.mjs`

**Component shape:**

```jsx
function ExerciseShell({
  lesson,
  session,
  item,
  feedback,
  children,
  feedbackSheet,
  onExit,
}) {
  const difficultyLabel = difficultyLabelForItem(item)
  const instruction = instructionForItemType(item)
  const percent = progressPercentForSession(session)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-4">
        <header className="flex items-center gap-3">
          <button type="button" aria-label="Sair" onClick={onExit} className="text-gray-400 hover:text-white">×</button>
          <div className="flex-1">
            <div className="mb-1 text-center text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">COMBO x{session?.correct_count || 0}</div>
            <div className="h-3 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500" style={{ width: `${percent}%` }} />
            </div>
          </div>
          <div className="text-sm font-bold text-pink-300">⚡ {session?.hearts_left ?? 0}</div>
        </header>

        <main className="flex-1 pt-8">
          {difficultyLabel && <div className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-rose-400">{difficultyLabel}</div>}
          <h2 className="text-2xl font-black">{instruction}</h2>
          <div className="mt-6">{children}</div>
        </main>

        {feedbackSheet}
      </div>
    </div>
  )
}
```

**Important:** Exact class names can be adjusted for current design, but keep one shell only.

**Step 1: Run contract test before implementation**

Expected: FAIL until shell is used.

**Step 2: Implement shell around existing exercise body**

Do not change payload creation, `check`, `next`, `finish`, or `canCheck` logic.

**Step 3: Run tests**

```bash
node src/lib/exerciseLayoutState.test.mjs
node src/lib/exerciseLayoutContract.test.mjs
npm run test:voice
```

Expected: PASS.

---

## Task 5: Split real-session exercise bodies by type

**Objective:** Make different item types visually distinct inside the same shell.

**Files:**
- Modify: `docker/frontend/src/pages/Exercises.jsx`
- Optional create later if file gets too large: `docker/frontend/src/components/exercises/ExerciseBodies.jsx`
- Tests: existing frontend tests plus new static contract checks.

**Target components:**

- `ChoiceExerciseBody`
- `ImageChoiceExerciseBody`
- `BuildExerciseBody`
- `ListenBuildExerciseBody`
- `SequenceDialogueExerciseBody`
- `MatchExerciseBody`
- `ContextChoiceExerciseBody`

**Rules:**

- These are not local practice panels.
- They render only the current real `item`.
- They use existing state: `selected`, `built`, `matched`, `typedAnswer`.
- They submit via existing `normalizedPayload` and `check`.
- They must not own progress, XP, or session state.

**Step 1: Add static test**

In `exerciseLayoutContract.test.mjs`:

```js
assert.match(source, /function ChoiceExerciseBody\(/)
assert.match(source, /function BuildExerciseBody\(/)
assert.doesNotMatch(source, /function .*Practice\(/)
```

**Step 2: Extract one type at a time**

Start with `ChoiceExerciseBody`, run tests, then proceed to the next.

**Step 3: Preserve behavior**

After each extraction:

```bash
node src/lib/exerciseLayoutContract.test.mjs
npm run test:voice
```

Expected: PASS after each small extraction.

---

## Task 6: Add Duolingo-style answer surfaces without changing validation

**Objective:** Improve visual states for current item answer area.

**Files:**
- Modify: `docker/frontend/src/pages/Exercises.jsx`
- Optional create: `docker/frontend/src/lib/exerciseAnswerState.mjs`
- Optional test: `docker/frontend/src/lib/exerciseAnswerState.test.mjs`

**Visual behavior:**

- Idle: neutral dark card/border.
- Selected: accent border.
- Correct feedback: green border/text where applicable.
- Wrong feedback: red correction area in bottom sheet, not inline clutter.

**Step 1: Add pure helper if needed**

```js
export function answerSurfaceTone({ feedback, hasSelection }) {
  if (feedback?.type === 'correct') return 'correct'
  if (feedback?.type === 'wrong') return 'wrong'
  if (hasSelection) return 'selected'
  return 'idle'
}
```

**Step 2: Test helper**

Use `node:test` with idle/selected/correct/wrong cases.

**Step 3: Apply helper classes to bodies**

No validation changes.

---

## Task 7: Keep explanation as local reveal only

**Objective:** Add `EXPLIQUE MINHA RESPOSTA` behavior using existing `feedback.explanation` / `mistake_feedback`.

**Files:**
- Modify: `docker/frontend/src/pages/Exercises.jsx`
- Test: `docker/frontend/src/lib/exerciseLayoutContract.test.mjs`

**Rules:**

- Do not create a new backend endpoint.
- Do not call an LLM.
- Do not create a new feature beyond revealing already available explanation.
- If no explanation exists, hide the button.

**Step 1: Add test**

Static test for button only inside `ExerciseFeedbackSheet`.

**Step 2: Implement local state**

Inside feedback sheet:

```jsx
const [showExplanation, setShowExplanation] = useState(false)
```

Reset when feedback changes.

**Step 3: Verify**

```bash
node src/lib/exerciseLayoutContract.test.mjs
npm run test:voice
```

---

## Task 8: Strengthen no-extra/local-practice guard

**Objective:** Prevent recurrence of the exact previous mistake.

**Files:**
- Modify: `docker/frontend/src/lib/localPracticeCarouselIntegration.test.mjs`
- Possibly keep all rewritten integration tests that assert no local panels.

**Add forbidden patterns:**

```js
const forbidden = [
  /Exercício extra/i,
  /Treino local/i,
  /Questão extra/i,
  /treino não altera XP\/progresso/i,
  /function \w*Practice\(/,
  /LocalPractice/,
  /activeLocalPracticeIndex/,
]
```

**Step 1: Run test**

```bash
node src/lib/localPracticeCarouselIntegration.test.mjs
```

Expected: PASS.

**Step 2: Confirm with grep before build**

```bash
grep -R "Exercício extra\|Treino local\|Questão extra\|treino não altera XP" docker/frontend/src || true
```

Expected: no matches in production UI files.

---

## Task 9: Backend validation remains real-session only

**Objective:** Prove the frontend redesign does not alter session item semantics.

**Files:**
- Modify only if tests reveal a bug:
  - `docker/backend/services.py`
  - `docker/backend/test_exercises_api.py`

**Tests to run:**

```bash
cd /home/victor/workspace/polyglot/docker/backend
./.venv/bin/python -m pytest test_exercises_api.py -q
./.venv/bin/python -m pytest test_exercise_content.py -q
```

Expected:

- Sessions still return `items` with max 20.
- Answering uses `answer_session`.
- Current index advances normally.
- No new unscored/local answer path exists.

---

## Task 10: Full verification and live disposable-user probe

**Objective:** Verify the feature in tests, build, Docker, and live API without touching Victor's progress.

**Commands:**

Frontend:

```bash
cd /home/victor/workspace/polyglot/docker/frontend
npm run test:voice
npm run build
```

Backend:

```bash
cd /home/victor/workspace/polyglot/docker/backend
./.venv/bin/python -m pytest -q
```

Docker:

```bash
cd /home/victor/workspace/polyglot
docker compose -f docker/docker-compose.yml up -d --build frontend
```

Health and bundle:

```bash
curl -fsS http://127.0.0.1:8095/health
curl -fsS http://127.0.0.1:3031/exercises | grep -o '/assets/[^" ]*\.js' | head -1
```

Forbidden string check in deployed bundle:

```bash
docker exec polyglot-frontend sh -lc "! grep -R 'Exercício extra\|Treino local\|Questão extra\|treino não altera XP\|ChunkBuilderPractice' /app/dist/assets /app/dist/index.html"
```

Disposable user API probe:

```bash
python3 - <<'PY'
import json, urllib.request
base='http://127.0.0.1:8095'
user_id=95001
urllib.request.urlopen(urllib.request.Request(f'{base}/users/{user_id}/bootstrap', method='POST')).read()
lessons=json.load(urllib.request.urlopen(f'{base}/exercise-lessons?user_id={user_id}'))
lesson=lessons[0]
s=json.load(urllib.request.urlopen(urllib.request.Request(f"{base}/exercise-lessons/{lesson['id']}/sessions?user_id={user_id}", method='POST')))
print(json.dumps({'session_number': s['session_number'], 'total_count': s['total_count'], 'items': len(s['items']), 'first_type': s['items'][0]['type']}, ensure_ascii=False))
PY
```

Expected:

- `total_count <= 20`
- `items == total_count`
- no forbidden strings in deployed bundle
- backend healthy

---

## Risks and tradeoffs

1. **Large `Exercises.jsx` file:** extracting bodies inside the same file may keep it large. Prefer a later cleanup to `src/components/exercises/` only after behavior is stable.
2. **Visual redesign can accidentally change answer payloads:** avoid touching `normalizedPayload`, `check`, and backend schemas in early tasks.
3. **Mobile layout regressions:** test manually on phone dimensions after build.
4. **Cache confusion:** deployed JS should use `Cache-Control: no-cache`; still verify bundle hash and forbidden strings.
5. **Feature boundary:** explanation button must only reveal existing explanation unless Victor separately approves AI explanations.

---

## Open questions for Victor before implementation

1. Should the visual direction copy only the **structure** of Duolingo, or also use a more playful/cartoon-like style?
2. Should Polyglot show a character/avatar in the exercise area now, or leave that for a later approved feature?
3. Should the success text be `Incrível!`, `Correto!`, or a rotating set of short feedback messages?
4. Should `EXPLIQUE MINHA RESPOSTA` appear after correct answers only, wrong answers only, or both?
5. Should combo/resource counters use existing `correct_count`/`hearts_left`, or should they remain visually hidden until a separate gamification approval?

---

## Approval gate

This plan is ready for review, but implementation must not start until Victor answers explicitly:

**Aprova implementar este layout para os exercícios reais da sessão? sim/não**
