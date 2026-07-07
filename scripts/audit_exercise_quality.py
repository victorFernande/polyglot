#!/usr/bin/env python3
"""Audit Polyglot exercise items for obvious content-quality problems."""
from __future__ import annotations

import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "docker" / "backend"
sys.path.insert(0, str(BACKEND))

from models import ExerciseItem, ExerciseLesson, SessionLocal  # noqa: E402

GENERIC_SEQUENCE_MARKERS = ["primeiro contexto", "depois detalhe", "em seguida resposta", "por fim fechamento"]
BAD_SEQUENCE_MIXES = [
    ("reise", "musik", "woher"),
    ("travel", "music", "where are you from"),
    ("voyage", "musique", "d'où"),
]
STOP_HINT_WORDS = {
    "a", "o", "e", "de", "do", "da", "das", "dos", "um", "uma", "uns", "umas", "the", "an", "to", "is", "in", "it",
    "ich", "je", "я", "私", "mein", "meine", "mon", "ma", "my", "ist", "est", "есть", "です",
}


def norm(text: object) -> str:
    return " ".join(str(text or "").casefold().split())


def answer_candidates(item: ExerciseItem) -> list[str]:
    candidates: list[str] = []
    if not isinstance(item.answer, dict):
        return candidates
    value = item.answer.get("value")
    if isinstance(value, str):
        candidates.append(value)
    elif isinstance(value, list):
        candidates.append(" ".join(str(x) for x in value))
        candidates.extend(str(x) for x in value if len(str(x)) > 4)
    for pair in item.answer.get("pairs") or []:
        candidates.extend(str(x) for x in pair if len(str(x)) > 4)
    return candidates


def audit() -> list[tuple[str, int, str, str]]:
    issues: list[tuple[str, int, str, str]] = []
    db = SessionLocal()
    try:
        lessons = db.query(ExerciseLesson).filter(ExerciseLesson.active == True).order_by(ExerciseLesson.language_code).all()  # noqa: E712
        for lesson in lessons:
            items = db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id).order_by(ExerciseItem.order_index).all()
            prompts = Counter(norm(item.prompt) for item in items)
            for item in items:
                prompt = norm(item.prompt)
                hint = norm(item.hint)
                explanation = norm(item.explanation)
                label = (lesson.language_code, item.order_index, item.type)

                if not item.prompt or not item.hint or not item.explanation:
                    issues.append((*label, "missing prompt/hint/explanation"))
                if item.type in {"choice", "listen_choice", "context_choice"}:
                    if not item.options or len(item.options) < 4:
                        issues.append((*label, "choice item has fewer than 4 options"))
                    if isinstance(item.answer, dict) and item.answer.get("value") not in (item.options or []):
                        issues.append((*label, "choice answer is not in options"))
                if item.type in {"build", "listen_build"}:
                    vals = item.answer.get("value") if isinstance(item.answer, dict) else None
                    if not isinstance(vals, list) or len(vals) < 2:
                        issues.append((*label, "build answer has fewer than 2 tokens"))
                    elif not all(token in (item.tiles or []) for token in vals):
                        issues.append((*label, "build answer token missing from tiles"))
                if item.type == "image_choice":
                    values = [opt.get("value") for opt in (item.options or []) if isinstance(opt, dict)]
                    if len(values) != 4 or len(set(values)) != 4:
                        issues.append((*label, "image choice options are not 4 unique values"))
                    if isinstance(item.answer, dict) and item.answer.get("value") not in values:
                        issues.append((*label, "image answer is not in options"))
                if item.type in {"match", "listen_match"}:
                    if not item.pairs or len(item.pairs) != 4:
                        issues.append((*label, "match item does not have 4 pairs"))
                if item.type == "sequence_dialogue":
                    vals = item.answer.get("value") if isinstance(item.answer, dict) else None
                    if not isinstance(vals, list) or len(vals) != 4:
                        issues.append((*label, "sequence answer is not 4 cards"))
                    elif len(set(vals)) != 4:
                        issues.append((*label, "sequence answer has duplicate cards"))
                    if any(marker in prompt for marker in GENERIC_SEQUENCE_MARKERS):
                        issues.append((*label, "sequence prompt uses generic order labels"))
                    joined = norm(" ".join(vals or []))
                    if any(all(term in joined for term in terms) for terms in BAD_SEQUENCE_MIXES):
                        issues.append((*label, "sequence mixes unrelated travel/hobby/origin phrases"))
                for candidate in answer_candidates(item):
                    c = norm(candidate)
                    if len(c) < 5 or c in STOP_HINT_WORDS:
                        continue
                    if c in hint:
                        issues.append((*label, f"hint reveals answer: {candidate}"))
                        break
        return issues
    finally:
        db.close()


if __name__ == "__main__":
    issues = audit()
    print(f"issues: {len(issues)}")
    by_reason = Counter(reason for *_rest, reason in issues)
    for reason, count in by_reason.most_common():
        print(f"{count:4d} {reason}")
    for row in issues[:100]:
        print(row)
    sys.exit(1 if issues else 0)
