#!/usr/bin/env python3
"""Review every ExerciseItem in the canonical Polyglot backend DB.

This is the cron gate for full-corpus QA. It intentionally reads the database,
not only the deterministic generator, so old rows and newly appended rows are
checked together before any OK report/commit.
"""
from __future__ import annotations

import json
import os
import sys
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "docker" / "backend"
DB = BACKEND / "polyglot.db"
OUT_DIR = ROOT / "reports" / "polyglot-audit"
OUT_JSON = OUT_DIR / "all_language_full_review.json"
OUT_MD = OUT_DIR / "all_language_full_review.md"

os.environ["DATABASE_URL"] = f"sqlite:///{DB}"
sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(ROOT / "shared" / "tools"))

from models import ExerciseItem, ExerciseLesson, SessionLocal  # noqa: E402
from polyglot_agent_review import add_repetition_verdicts, review_item  # noqa: E402

LANGUAGES = ["de", "fr", "ru", "jp", "en"]


def item_to_dict(item: ExerciseItem) -> dict[str, Any]:
    return {
        "type": item.type,
        "prompt": item.prompt,
        "answer": item.answer,
        "options": item.options,
        "tiles": item.tiles,
        "pairs": item.pairs,
    }


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    db = SessionLocal()
    rows: list[dict[str, Any]] = []
    try:
        for code in LANGUAGES:
            lesson = (
                db.query(ExerciseLesson)
                .filter(ExerciseLesson.language_code == code, ExerciseLesson.active == True)
                .first()
            )
            if lesson is None:
                rows.append({
                    "language": code,
                    "index": 0,
                    "verdict": "BLOCK",
                    "severity": "high",
                    "type": "missing_lesson",
                    "prompt": "",
                    "issues": [{"severity": "high", "code": "missing_active_lesson", "message": f"No active lesson for {code}"}],
                })
                continue
            items = (
                db.query(ExerciseItem)
                .filter(ExerciseItem.lesson_id == lesson.id)
                .order_by(ExerciseItem.order_index)
                .all()
            )
            for item in items:
                rows.append(review_item(code, int(item.order_index) - 1, item_to_dict(item)))
    finally:
        db.close()

    rows = add_repetition_verdicts(rows)
    verdicts = Counter(row["verdict"] for row in rows)
    issue_codes = Counter(issue["code"] for row in rows for issue in row["issues"])
    failing = [row for row in rows if row["verdict"] != "PASS"]
    summary = {
        "total": len(rows),
        "verdicts": dict(verdicts),
        "issue_codes": dict(issue_codes),
        "failures": failing,
    }
    OUT_JSON.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "# Revisão full DB — Polyglot",
        "",
        f"- Total: {len(rows)}",
        f"- Veredictos: {dict(verdicts)}",
        f"- Issue codes: {dict(issue_codes)}",
        "",
    ]
    if failing:
        lines.append("## Falhas")
        for row in failing[:100]:
            lines.append(f"- {row['language']} #{row['index']} {row['verdict']} {row['type']} — {row['issues'][:3]}")
    else:
        lines.append("PASS: nenhuma falha encontrada no DB completo.")
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")

    print(json.dumps({"total": len(rows), "verdicts": dict(verdicts), "issue_codes": dict(issue_codes)}, ensure_ascii=False, indent=2))
    print(OUT_JSON)
    print(OUT_MD)
    return 1 if failing else 0


if __name__ == "__main__":
    raise SystemExit(main())
