# Polyglot cron 20260712-100118

## Contagens

Antes:
```
de: 1290 items, last_block=10, session=Trilha A1 Situacional 1000 — Alemão
en: 1290 items, last_block=10, session=Trilha A1 Situacional 1000 — Inglês
fr: 1290 items, last_block=10, session=Trilha A1 Situacional 1000 — Francês
jp: 1290 items, last_block=10, session=Trilha A1 Situacional 1000 — Japonês
ru: 1290 items, last_block=10, session=Trilha A1 Situacional 1000 — Russo
```

Geração:
```
de: +5
fr: +5
ru: +5
jp: +5
en: +5
total: +25
```

Depois:
```
de: 1295 items, last_block=15, session=Trilha A1 Situacional 1000 — Alemão
en: 1295 items, last_block=15, session=Trilha A1 Situacional 1000 — Inglês
fr: 1295 items, last_block=15, session=Trilha A1 Situacional 1000 — Francês
jp: 1295 items, last_block=15, session=Trilha A1 Situacional 1000 — Japonês
ru: 1295 items, last_block=15, session=Trilha A1 Situacional 1000 — Russo
```

## QA

Review antes/depois: 100/100 PASS em ambas as execuções. Kimi via 9Router retornou status blocked/unusable no wrapper; GPT 9Router ok.

Frontend boundary:
```
PASS: nenhum padrão forbidden em Exercises.jsx
```

Testes:
- PASS: scripts/test_cron_session_rules.py, docker/backend/test_cron_incremental.py, docker/backend/test_polyglot_agent_review.py
- FAIL conhecido no teste docker/backend/test_exercise_content.py::test_real_database_cron_round_uses_latest_snapshot durante execução conjunta: o teste recarrega DATABASE_URL relativo/ambiente temporário e observou 1255 itens, enquanto o snapshot direto do DB do projeto validou 1290 -> 1295 por idioma.

Snapshot JSON: docker/backend/reports/polyglot-cron/20260712-100118/20260712-100118-snapshot.json
