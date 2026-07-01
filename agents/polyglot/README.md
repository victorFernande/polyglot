# POLYGLOT-QA Agent

Imported from `polyglot-agent-files.zip` and installed into:

- Hermes profile: `polyglot`
- Repo agent files: `agents/polyglot/agent/`
- BotManager/Cortex OpenClaw source: `/home/victor/BotManager/cortex/openclaw/agents/botmanager-polyglot/agent/`
- Claw3D state: `~/.claw3d/state/openclaw.json`

## Mission

Review and create Polyglot language-learning exercises with strict QA over:

- prompts/enunciados;
- answer keys;
- alternatives/distractors;
- hints and feedback;
- translations and grammar;
- audio/transcript alignment;
- lesson/topic fit;
- exercise variety.

## Local tools

From repo root:

```bash
# Review generated items deterministically
python3 shared/tools/polyglot_agent_review.py --recent 20

# JSON output for automation
python3 shared/tools/polyglot_agent_review.py --language de --recent 20 --json

# Generate new exercise ideas/blueprints
python3 shared/tools/polyglot_agent_generate_ideas.py --language de --unit 2 --topic 5 --count 8
```

## Cron

Hermes cron job `polyglot-agent-review-recent-questions` runs the `polyglot` profile against recent generated questions and reports findings to Victor.

## Safety

- Never advance Victor's real learner progress during validation.
- Use disposable test users for API/UI probes.
- Do not call external translation/provider APIs directly; use 9Router only.
- Treat ambiguous/off-topic questions as blockers.
