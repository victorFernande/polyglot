# Agent Pipeline — polyglot

## Required Files Per Managed Repo

- `.husky/pre-commit`
- `.husky/pre-push`
- `AGENTS.md`
- `SOUL.md`
- `IDENTITY.md`
- `ROLE.md`
- `USER.md`
- `TOOLS.md`
- `MEMORY.md`
- `HEARTBEAT.md`
- `WORKFLOW.md`
- `PIPELINE.md`
- `.github/workflows/agent-mention-router.yml`, only if the repo uses GitHub PM routing
- `.github/workflows/workflow-pipeline.yml`, only if the repo uses GitHub Actions
- `.github/workflows/gate-enforcement.yml`, only if the repo uses GitHub Actions

## Required Checks

Use repo-native commands, in this order:

1. format check, when available
2. lint
3. typecheck, when available
4. tests
5. build, when available
6. content schema validation, when available
7. question QA validation, when available
8. fixture/export validation, when available

Do not invent commands. Use the repository's documented scripts.

## Content QA Checks

When reviewing Polyglot question content, verify:

1. schema validity
2. required fields
3. question type compatibility
4. prompt/answer alignment
5. correct answer validity
6. accepted variants
7. distractor quality
8. grammar and spelling
9. translation quality
10. difficulty/lesson fit
11. feedback/hint quality
12. audio/transcript alignment, when present
13. safety and inclusion
14. duplicate or near-duplicate questions

## Verdict Contract

Every reviewed item must end with one of:

- `PASS` — ready to ship
- `REVISE` — needs correction before ship
- `BLOCK` — must not reach learners

For batches, report counts:

```json
{
  "repo": "polyglot",
  "batch": "<batch-id>",
  "pass": 0,
  "revise": 0,
  "block": 0,
  "ts": "<iso timestamp>"
}
```

## NATS Publish Contract

Pre-push must publish exactly one CI event.

### Success

```bash
nats pub cortex.ci.polyglot.passed '{"repo":"polyglot","sha":"'"$(git rev-parse HEAD)"'","ts":"'"$(date -Is)"'"}'
```

### Failure

```bash
nats pub cortex.ci.polyglot.failed '{"repo":"polyglot","sha":"'"$(git rev-parse HEAD)"'","ts":"'"$(date -Is)"'","tail":"check failed"}'
```

## Content Review Event Contract

When a content review batch completes, publish one review event.

### Review Passed

Use only if every item is `PASS`:

```bash
nats pub cortex.content.polyglot.review_passed '{"repo":"polyglot","batch":"<batch-id>","pass":<n>,"revise":0,"block":0,"ts":"'"$(date -Is)"'"}'
```

### Review Needs Changes

Use if any item is `REVISE` and none are `BLOCK`:

```bash
nats pub cortex.content.polyglot.review_revise '{"repo":"polyglot","batch":"<batch-id>","pass":<n>,"revise":<n>,"block":0,"ts":"'"$(date -Is)"'"}'
```

### Review Blocked

Use if any item is `BLOCK`:

```bash
nats pub cortex.content.polyglot.review_blocked '{"repo":"polyglot","batch":"<batch-id>","pass":<n>,"revise":<n>,"block":<n>,"ts":"'"$(date -Is)"'"}'
```

## Factory Install Rule

Agent factory must copy `WORKFLOW.md` and `PIPELINE.md` into every new agent directory and install repo workflow files into every target repo before marking the agent healthy.

## Merge Rule

No merge without PM thread approval.

## Production Rule

No production content edits unless the task explicitly says production is the target and PM/owner approval is present.
