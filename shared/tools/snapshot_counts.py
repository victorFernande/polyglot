#!/usr/bin/env python3
"""Snapshot current ExerciseItem counts per active language from backend DB."""
import os, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "docker" / "backend"))
os.environ.setdefault("DATABASE_URL", f"sqlite:///{ROOT / 'docker' / 'backend' / 'polyglot.db'}")
from services import ExerciseService
from models import SessionLocal, ExerciseLesson, ExerciseItem

db = SessionLocal()
try:
    lessons = db.query(ExerciseLesson).filter(ExerciseLesson.active == True).order_by(ExerciseLesson.language_code).all()
    for lesson in lessons:
        items = db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id).count()
        last = items % ExerciseService.SESSION_SIZE
        print(f"{lesson.language_code}: {items} items, last_block={last}, session={lesson.title}")
finally:
    db.close()
