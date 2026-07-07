#!/usr/bin/env python3
"""Polyglot incremental exercise cron.

Generates real ExerciseItem rows in the backend for every active language,
respecting the 20-item session-size contract:

- 0 or 1-15 items in the last block -> add at most 5
- 16-19 items in the last block -> add only enough to close 20
- never exceed 20 items per session

Usage:
    python cron_incremental.py
    python cron_incremental.py --snapshot-dir reports/polyglot-cron
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Set DATABASE_URL before importing models so the module-level engine uses it.
if "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = "sqlite:///./polyglot.db"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base, ExerciseItem, ExerciseLesson
from services import ExerciseService

LANGUAGES = ["de", "fr", "ru", "jp", "en"]


def get_db_session(database_url: str):
    engine = create_engine(database_url)
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def take_snapshot(db) -> dict[str, int]:
    snapshot: dict[str, int] = {}
    for code in LANGUAGES:
        lesson = db.query(ExerciseLesson).filter(
            ExerciseLesson.language_code == code, ExerciseLesson.active == True
        ).first()
        if lesson is None:
            snapshot[code] = 0
        else:
            snapshot[code] = db.query(ExerciseItem).filter(
                ExerciseItem.lesson_id == lesson.id
            ).count()
    return snapshot


def add_incremental_batches(db) -> dict[str, int]:
    added: dict[str, int] = {}
    for code in LANGUAGES:
        added[code] = ExerciseService.add_next_incremental_batch(db, code)
    return added


def write_snapshot(snapshot: dict[str, int], after: dict[str, int], snapshot_dir: Path) -> Path:
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d-%H%M%S")
    path = snapshot_dir / f"{timestamp}-snapshot.json"
    payload = {
        "timestamp": timestamp,
        "before": snapshot,
        "after": after,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Polyglot incremental exercise cron")
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL", "sqlite:///./polyglot.db"),
        help="SQLAlchemy database URL",
    )
    parser.add_argument(
        "--snapshot-dir",
        default="reports/polyglot-cron",
        help="Directory to write the before/after snapshot JSON",
    )
    parser.add_argument(
        "--bootstrap",
        action="store_true",
        help="Bootstrap active lessons if they do not exist",
    )
    args = parser.parse_args()

    database_url = args.database_url
    snapshot_dir = Path(args.snapshot_dir)
    if not snapshot_dir.is_absolute():
        snapshot_dir = Path(__file__).resolve().parent / snapshot_dir

    db = get_db_session(database_url)
    try:
        if args.bootstrap:
            ExerciseService.ensure_seed_lessons(db)
            before = take_snapshot(db)
            after = dict(before)
            added = {code: 0 for code in LANGUAGES}
        else:
            before = take_snapshot(db)
            added = add_incremental_batches(db)
            after = take_snapshot(db)

        snapshot_path = write_snapshot(before, after, snapshot_dir)

        print(f"Polyglot cron incremental round complete.")
        print(f"Snapshot: {snapshot_path}")
        for code in LANGUAGES:
            print(f"  {code}: {before[code]} -> {after[code]} (+{added[code]})")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
