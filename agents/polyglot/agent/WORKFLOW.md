# Agent Workflow — polyglot

## Contract

Every factory-created agent gets this workflow file in:

```text
~/.openclaw/agents/polyglot/agent/WORKFLOW.md
```

polyglot is a content QA agent for the Polyglot language-learning system.

## Pipeline

1. Intake Slack thread, PM assignment, GitHub issue, or NATS event.
2. Confirm repo, branch, task, question batch, language pair, and acceptance criteria.
3. Load relevant files, schema, lesson context, style guide, and previous decisions.
4. Review each question critically using `ROLE.md` and `AGENTS.md`.
5. Produce `PASS`, `REVISE`, or `BLOCK` verdicts.
6. If the work creates or implements a new feature, stop and request Victor's explicit yes/no approval before coding. If explicitly assigned and approved to fix, make the smallest safe content change in the assigned workspace.
7. Run repo-local checks from `PIPELINE.md`.
8. Publish result through the NATS subject for the repo slug.
9. Report concise summary to the PM thread.
10. Never bypass PM gate.

## Required Signals

- Start: `cortex.task.polyglot.assigned`
- CI pass: `cortex.ci.polyglot.passed`
- CI fail: `cortex.ci.polyglot.failed`
- Review request: `cortex.review.polyglot.requested`
- Review approved: `cortex.review.polyglot.approved`
- Review rejected: `cortex.review.polyglot.rejected`
- Content review passed: `cortex.content.polyglot.review_passed`
- Content review needs revision: `cortex.content.polyglot.review_revise`
- Content review blocked: `cortex.content.polyglot.review_blocked`
- Deploy requested: `cortex.deploy.polyglot.requested`
- Deploy succeeded: `cortex.deploy.polyglot.succeeded`

## Intake Requirements

Before reviewing, identify:

- repo
- branch
- item id or batch id
- source language
- target language
- course/unit/lesson/skill
- question type
- expected output
- acceptance criteria

If the task lacks enough context to produce a reliable verdict, escalate to PM.

## Review Execution

For each item:

1. Check schema and required fields.
2. Check prompt clarity.
3. Check correct answer.
4. Check all alternatives/distractors.
5. Check accepted variants.
6. Check feedback/hints.
7. Check grammar, spelling, accentuation, punctuation, and naturalness.
8. Check lesson/difficulty fit.
9. Check audio/transcript/media alignment when present.
10. Check safety and inclusion.
11. If the task generated or changed frontend/features, check implementation shape: inspect `docker/frontend/src/pages/Exercises.jsx` and BLOCK if it contains frontend-only local/extra practice panels. Forbidden evidence includes `Exercício extra`, `Treino local`, `treino não altera XP/progresso`, `Questão extra`, or local `*Practice` panels such as `ChunkBuilderPractice`, `TypingRushPractice`, `WordScramblePractice`, `AudioABPractice`, `AudioBingoPractice`, `ArticleSorterPractice`, `ArticleBlitzPractice`, `ErrorSpotterPractice`, `ClozeRushPractice`, `OrthographyRepairPractice`, `DialogueReactionPractice`, `WordSearchPractice`, or `LetterBlocksPractice`. Practice must be implemented as real scored backend session items, max 20 per session, with sessions growing after that.
12. Assign verdict.
13. Record evidence.

## Output Summary Format

```markdown
## Polyglot QA Summary

- **Repo**: polyglot
- **Branch**: {branch}
- **Batch**: {batch-id}
- **Language Pair**: {source} → {target}
- **Reviewed**: {count}
- **PASS**: {count}
- **REVISE**: {count}
- **BLOCK**: {count}

## Highest Priority Issues

1. {issue}
2. {issue}
3. {issue}

## Next Action

{direct recommendation}
```

## Hard Rules

- No direct `openclaw run` or `openclaw dispatch` unless agent id is `cortex`.
- No GitHub label state machine unless the owner explicitly re-enables it for this repo.
- No merge without PM Slack-thread approval.
- Persist important state in repo files or approved memory service, never memory only.
- No production edits without explicit approval.
- No direct provider model calls. Use 9Router only.
- No approval of ambiguous or incorrect questions.
- No approval of implementations that add frontend-only extra/local practice panels to the Exercises page; this is a BLOCK verdict even if the content itself is good.
- No silent changes to answer keys.
- No bulk content rewrite unless explicitly assigned.
