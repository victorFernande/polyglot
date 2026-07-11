# Polyglot cron incremental 20260711-190112

- Idiomas: de, fr, ru, jp, en
- Antes: 1305 itens por idioma
- Adicionado: +5 por idioma (+25 total)
- Depois: 1310 itens por idioma
- Revisao recente pos-geracao: 20/20 PASS por idioma em review-after-*-rerun.json
- Observacao: Kimi via 9Router retornou 502 em en/fr/jp/ru no rerun; revisao deterministica e GPT passaram. Alemão teve GPT+Kimi ok.
- Frontend boundary: PASS, sem padroes frontend-only proibidos em Exercises.jsx
- Teste: docker/backend/.venv/bin/python -m pytest scripts/test_cron_session_rules.py PASS
