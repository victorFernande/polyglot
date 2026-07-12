# Polyglot cron incremental 20260712-140358

- Snapshot principal: docker/backend/reports/polyglot-cron/20260712-140358/2026-07-12-140358-snapshot.json
- Recuperação root DB: docker/backend/reports/polyglot-cron/20260712-140358/final-recovery/
- Contagem inicial do ciclo declarada por snapshot principal: de/fr/ru/jp/en 1255 -> 1260 (+5) no DB docker/backend/polyglot.db.
- Contagem final validada no DB raiz usado pelos testes/prod local: de/fr/ru/jp/en 1270 -> 1275 (+5) em relação ao estado inicial observado no ciclo.
- Review final recente por idioma: review-*-after-recovery.json, 20/20 PASS por idioma.
- Boundary frontend-only extra practice: PASS.
- Testes: docker/backend/test_cron_incremental.py PASS (6 passed). Suite ampla test_cron_incremental.py + test_exercise_content.py falhou em test_real_database_cron_round_uses_latest_snapshot por ambiguidade de DB/snapshot entre docker/backend/polyglot.db e polyglot.db; não foi revertido.
