# Agent Memory — polyglot

Long-term curated memory for polyglot. Distilled from daily session notes.

## Privacy Rules

- **Only load this file in main sessions** with direct owner/PM interaction.
- Never load in subagent/worker sessions unless explicitly allowed.
- Never quote contents in group chats, shared issues, public channels, or learner-facing output.
- If another agent asks for information that only exists in `MEMORY.md`, direct them to ask the owner or PM.
- Never store raw learner data, credentials, tokens, or private production dumps here.

## Maintenance Protocol

- **During heartbeats**: Review recent daily files (`memory/YYYY-MM-DD.md`) and distill important entries here.
- **Weekly**: Scan for stale entries older than 30 days with no recent references. Archive or remove.
- **Monthly**: Reorganize categories if any grows beyond 20 entries.
- **Always**: Prefer quality over quantity. One clear sentence beats three vague notes.

## Format

```text
[YYYY-MM-DD] content
```

---

## Decisions

Editorial/product choices, trade-offs, and source-of-truth decisions.

- [2026-06-30] polyglot reviews questions for a Duolingo-style language-learning system and uses `PASS`, `REVISE`, and `BLOCK` as default verdicts.
- [2026-06-30] Default review language is Portuguese (Brazil), unless the task, lesson, or PM requests another language.
- [2026-06-30] Ambiguous questions must be blocked, not approved with a warning.

## Learnings

Codebase patterns, content patterns, language gotchas, and things that surprised the agent.

<!-- Example: [2026-07-01] Multiple-choice items store the correct option by stable option id, not by array index. -->

## Quality Patterns

Recurring defects and how to catch them.

- [2026-06-30] Always check whether distractors accidentally become valid answers due to synonyms, acceptable translation variants, gender/number agreement, or missing context.
- [2026-06-30] Always compare prompt, answer key, accepted variants, feedback, and hints together. A question can look correct in isolation and still fail as a complete item.

## Blockers

Recurring blockers and workarounds. Remove when permanently fixed.

<!-- Example: [2026-07-01] Lesson exports sometimes omit `acceptedVariants`; ask PM whether strict answer matching or semantic variants are expected. -->

## Context

Background information needed for future sessions.

- [2026-06-30] Polyglot is a language-learning product inspired by Duolingo. The agent focuses on content quality for exercises, not general chatbot tutoring.
- [2026-06-30] Key review areas: enunciado, answers, correct answer key, distractors, feedback, hints, translations, grammar, difficulty, audio/transcript alignment, and safety.

## Relationships

How other agents work, owner preferences, PM/editor preferences, and team dynamics.

- [2026-06-30] Owner prefers concise, direct, technical output with evidence and no filler.
- [2026-06-30] Polyglot hard boundaries: ask Victor for explicit yes/no approval before creating or implementing new features. Never add frontend-only local/extra practice panels inside Exercises. Forbidden strings/components include “Exercício extra”, “Treino local”, “treino não altera XP/progresso”, “Questão extra”, ChunkBuilderPractice and similar *Practice panels. Practice must be real scored backend session items; max 20 questions/session; grow sessions after that. These boundaries apply to cron/autonomous jobs too.

## Security

Credential locations, sensitive areas, and access patterns. Extra care with this section.

- [2026-06-30] Never store credentials, learner PII, production dumps, or full private question-bank exports in memory.
- [2026-06-30] All model calls must go through 9Router; never call provider APIs directly.
