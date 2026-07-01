# Polyglot full exercise audit — 2026-06-30

## Scope

- Audited 5,000 generated exercise items across DE/FR/RU/JP/EN.
- No production data/content was modified during this audit.
- Artifacts:
  - `exercise_export.jsonl`
  - `full_audit_deterministic.csv`
  - `summary_deterministic.json`
  - `gpt_review.md`
  - `kimi_review.md`
  - `polyglot_qa_review.md`

## Deterministic audit verdict

**BLOCK** for current generated content quality.

Counts:

- Total: 5,000
- PASS: 4,208
- REVISE: 338
- BLOCK: 454

Severity:

- High: 454
- Medium: 338
- None: 4,208

Issue codes:

- `sequence_missing_explicit_order`: 450
- `sequence_ambiguous_dialogue_flow`: 450
- `generic_book_icon`: 338
- `visible_answer_leak`: 4

## Main blocker

`sequence_dialogue` is the systematic failure.

450 of 500 sequence-dialogue exercises ask the learner to “ordenar pelo fluxo lógico da situação” but do not teach or state the required order. For a beginner, especially a child-level learner, this becomes guessing.

Example:

- Prompt: `monte uma sequência curta; ordene as frases pelo fluxo lógico da situação`
- Expected order: `Hallo → Ich möchte einen Kaffee. → Ein Wasser, bitte. → Ich möchte ein Brot.`

Problem: the prompt does not say the intended order, roles, or scenario logic. Multiple orders can feel plausible to a novice.

## Other gaps

### Image choices

338 `image_choice` items still use generic `book` icons for non-book concepts. This is not pedagogically reliable when the exercise says to observe the image.

Rule: if the image does not represent the concept, either create a semantic icon/scene or do not use `image_choice`.

### Answer leaks

4 `choice` items contain visible answer leaks. These must be fixed before release because they invalidate scoring.

### Vocabulary progression

Victor's examples (`ohne`, `Vielen`, `Was`, `Empfehlen`, `Sie`) show a broader curriculum issue: exercises may use restaurant words before the learner has enough scaffolding. The deterministic audit caught sequence ambiguity and prompt leaks, but a full lexical progression pass should be added next.

## GPT review

GPT verdict: **BLOCK**.

GPT agreed the issue is systematic:

- 454 BLOCK/high severity items are not production-ready.
- 450 sequence-dialogue items need regeneration/redesign, not a cosmetic prompt change.
- Any answer leak must be removed.
- Image choice must use semantically meaningful visuals.

## Kimi review

Kimi identified the same three classes:

- sequence-dialogue instruction/order problems;
- generic image-choice placeholders;
- answer leaks.

Kimi used softer wording (“aprovado com ressalvas”), but its corrections still require fixing the same issues before trusting the exercises for beginners. Given the deterministic and GPT findings, final release verdict remains **BLOCK**.

## POLYGLOT-QA local checker result

The current local `shared/tools/polyglot_agent_review.py` returned:

- PASS: 5,000
- issue codes: none

This is itself a QA gap. The local checker is currently too weak for:

- sequence-dialogue missing explicit order;
- pedagogical guessing risk;
- generic image icons;
- visible answer leaks caught by the stronger deterministic audit.

Action: update `polyglot_agent_review.py` before relying on it as final gate.

## Required correction rules

1. Sequence dialogue must state the intended order without giving target-language answers directly.
   - Acceptable: `No restaurante: 1) cumprimente, 2) peça o menu, 3) peça o prato, 4) agradeça.`
   - Not acceptable: `ordene pelo fluxo lógico da situação`.

2. New vocabulary must be scaffolded before complex tasks.
   - If a word has not appeared in a simpler recognition/choice/listening item, do not use it in sequence/build/match as if already known.

3. Image-choice requires semantic images.
   - No generic `book` fallback for abstract/unrelated phrases.
   - If visual cannot represent the concept, use text/listening/match instead.

4. No answer leaks.
   - Prompt, image label, audio transcript, parenthetical clue, and displayed metadata must not contain the target answer before response.

5. Regression gates needed:
   - block `sequence_dialogue` prompts without explicit order markers;
   - block answer leaks in visible prompt/audio prompt;
   - block generic `book` icons for non-book concepts;
   - track introduced vocabulary by unit/topic and flag complex tasks using unintroduced content;
   - make POLYGLOT-QA local fail on these patterns.

## Recommended next step

Do not ship/regenerate blindly. First update the generator and QA gate, then rerun the full 5,000-item audit. Only after deterministic + GPT + Kimi + POLYGLOT-QA agree should the content be promoted.
