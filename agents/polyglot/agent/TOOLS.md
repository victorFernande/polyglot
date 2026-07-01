# Tools & Environment — polyglot

## VPS Platform

- **OS**: Ubuntu 24.04+
- **Container Runtime**: Docker + Docker Compose
- **Networking**: Tailscale VPN for inter-service and remote access
- **Process Manager**: systemd for host services, Docker for containers
- **Services Root**: `$CORTEX_ROOT/stacks/`

## AI Gateway — 9Router

All model calls go through 9Router. Never call provider APIs directly.

```text
Endpoint:     http://127.0.0.1:20128/v1/chat/completions
Models list:  http://127.0.0.1:20128/v1/models
Health check: http://127.0.0.1:20128/health
```

- Routes to multiple providers.
- Handles rate limiting, cost tracking, and fallback.
- Use model names prefixed with `9router/`.
- If 9Router is unreachable, stop and report. No direct fallback.

## Primary Models

| Purpose | Model |
|---------|-------|
| Main content QA | `9router/cx/gpt-5.5` |
| Fallback review | `9router/cc/claude-opus-4-6` |
| Antagonist review | any approved non-primary model routed through 9Router |

## AWS Emulator — Floci

Local AWS services for development and testing:

```text
Endpoint: http://127.0.0.1:4566
Profile:  floci
Region:   us-east-1
```

Available services:

- S3
- Lambda
- DynamoDB
- SQS
- SNS
- IAM
- CloudFormation

Example:

```bash
aws --profile floci --endpoint-url http://127.0.0.1:4566 s3 ls
```

## Databases

| Database | Host | Port | Notes |
|----------|------|------|-------|
| PostgreSQL | 127.0.0.1 | 5432 | Primary relational DB, if Polyglot uses SQL content storage |
| MySQL | 127.0.0.1 | 3306 | Legacy app support, if present |
| MongoDB | 127.0.0.1 | 27017 | Document/question store, if present |
| Redis | 127.0.0.1 | 6379 | Cache, queues, pub/sub |

Credentials are in `.secrets/cortex-credentials.md`. Never hardcode them. Never echo them.

## Knowledge & Memory Services

### OpenViking — Knowledge Base

```text
Endpoint: http://127.0.0.1:8000
```

Use for semantic search over indexed documents, code, style guides, curriculum notes, and workspace knowledge.

### Hindsight — Agent Memory

```text
Endpoint: http://127.0.0.1:8889
```

Use for structured memory storage and retrieval. Complements file-based `MEMORY.md`.

## Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 24+ | JavaScript runtime |
| Bun | latest | JS runtime, bundler, test runner |
| GitHub CLI (`gh`) | latest | Issues, PRs, actions, releases |
| AWS CLI | v2 | Floci interaction |
| Docker | latest | Container management |
| Docker Compose | v2 | Multi-container orchestration |
| Git | latest | Version control |
| jq | latest | JSON processing |
| curl | latest | HTTP requests |
| nats | latest | Publish/subscribe task and CI events |

## Approved Review Sources

Use these before asking for clarification:

- repository content files
- question schema
- fixtures and exports
- lesson/curriculum documents
- style guide
- grammar notes
- prior PM/editor decisions
- `MEMORY.md`, main sessions only
- `memory/YYYY-MM-DD.md`
- OpenViking indexed docs
- Hindsight agent memory

## Prohibited Sources Without Approval

- external translation APIs
- public paste tools
- direct provider model APIs
- production learner data dumps
- paid cloud/model services
- personal accounts not listed in this file

## Skills System

Skills live in the workspace `skills/` directory. Check each `SKILL.md` before first use.

| Skill | Purpose |
|-------|---------|
| `gstack` | Quality gates and antagonist review |
| `writing-plans` | Structured plans for large review/fix work |
| `executing-plans` | Batch execution and checkpoints |
| `gh-issues` | GitHub issue management and triage |
| `mem` | Memory read/write/search/curation |
| `smart-memory` | Search prior decisions and daily notes |
| `9router` | Model routing, health, usage |
| `model-usage` | Cost/token tracking |
| `caveman` | Terse communication mode |
| `clawteam` | Multi-agent coordination and handoffs |

## Git Conventions

- Branch naming: `review/{issue-number}-polyglot-content`, `fix/{issue-number}-polyglot-question`, or `triage/{issue-number}-polyglot-batch`
- Commit format: `Content QA(polyglot): {description}`
- Never force push.
- Never rewrite shared history.
- One logical change per commit.

## Data Safety

- Do not print credentials.
- Do not print raw learner data.
- Do not export full private question banks to external tools.
- Use local approved tools for analysis.
- If sensitive data appears in a task, minimize exposure and report it.
