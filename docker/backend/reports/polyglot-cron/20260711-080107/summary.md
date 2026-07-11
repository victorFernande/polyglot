# Polyglot Cron Incremental 20260711-080107

- Diretório: `docker/backend/reports/polyglot-cron/20260711-080107`
- Snapshot: `docker/backend/reports/polyglot-cron/20260711-080107/2026-07-11-080451-snapshot.json`
- Frontend boundary: PASS (`Exercises.jsx` sem padrões de treino local/extra)
- Revisão recente por idioma: 20 itens pós-geração revisados por idioma, sem itens não-PASS reportados pelo validador local
- Testes: `docker/backend/.venv/bin/python -m pytest docker/backend/test_cron_incremental.py docker/backend/test_exercise_content.py -q` PASS

## Contagens

| idioma | antes | depois | delta |
|---|---:|---:|---:|
| de | 1255 | 1260 | +5 |
| fr | 1255 | 1260 | +5 |
| ru | 1255 | 1260 | +5 |
| jp | 1255 | 1260 | +5 |
| en | 1255 | 1260 | +5 |

## Artefatos

- `cron.txt`
- `frontend-boundary.txt`
- `pytest.txt`
- `review-*-before.json`
- `review-*-after.json`
- `2026-07-11-080451-snapshot.json`
