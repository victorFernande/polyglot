#!/usr/bin/env python3
"""Cron incremental de geração de ExerciseItems para o Polyglot.

Adiciona até 5 novos ExerciseItems reais por idioma ativo a cada execução,
respeitando o tamanho de sessão (SESSION_SIZE=20):
- 0 ou 1-15 itens no último bloco -> cria no máximo 5
- 16-19 itens no último bloco -> cria só o necessário para fechar 20
- nunca ultrapassa 20 itens por sessão

O script nunca gera conteúdo frontend-only, treino local, questão extra ou
atividade sem XP. Todos os itens são persistidos como ExerciseItem backend.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "docker" / "backend"
sys.path.insert(0, str(BACKEND))

from models import SessionLocal, init_db  # noqa: E402
from services import ExerciseService  # noqa: E402

LANGUAGES = ["de", "fr", "ru", "jp", "en"]


def run() -> dict[str, int]:
    init_db()  # create tables/achievements when running on a fresh database
    db = SessionLocal()
    try:
        counts: dict[str, int] = {}
        # ensure_seed_lessons creates/regenerates the canonical lessons once per run
        ExerciseService.ensure_seed_lessons(db)
        for code in LANGUAGES:
            added = ExerciseService.add_next_incremental_batch(db, code)
            counts[code] = added
        return counts
    finally:
        db.close()


if __name__ == "__main__":
    added = run()
    total = sum(added.values())
    for code, count in added.items():
        print(f"{code}: +{count}")
    print(f"total: +{total}")
    sys.exit(0)
