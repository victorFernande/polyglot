#!/usr/bin/env python3
"""Test regression for cron_add_incremental_exercises session rules.

Run with docker/backend/.venv/bin/python -m pytest from repo root.
"""
from __future__ import annotations

import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "docker" / "backend"
sys.path.insert(0, str(BACKEND))

from services import ExerciseService  # noqa: E402


class FakeLesson:
    def __init__(self, item_count: int, session_size: int = 20):
        self.id = 1
        self.items = [object() for _ in range(item_count)]


class FakeDB:
    def __init__(self, item_count: int, added: list):
        self._item_count = item_count
        self.added = added
        self._flushed = False

    def query(self, *args, **kwargs):
        model = args[0] if args else None
        class Q:
            def __init__(self, outer, count, model):
                self.outer = outer
                self._count = count
                self._model = model

            def filter(self, *args, **kwargs):
                return self

            def first(self):
                if self._model and self._model.__name__ == "ExerciseLesson":
                    return FakeLesson(self._count)
                return self._count

            def count(self):
                if self._model and self._model.__name__ == "ExerciseItem":
                    return self._count
                return self._count

        return Q(self, self._item_count, model)

    def add(self, obj):
        self.added.append(obj)

    def flush(self):
        self._flushed = True

    def commit(self):
        pass

    def refresh(self, obj):
        pass

    def close(self):
        pass


def fake_generate_batch(code, current_count, max_new):
    return [{"type": "choice", "prompt": f"{code}-{i}", "answer": {"value": "a"}, "options": ["a", "b"], "tiles": None, "pairs": None, "hint": "h", "explanation": "e", "xp_reward": 8} for i in range(max_new)]


def test_zero_items_adds_up_to_session_size():
    original = ExerciseService.generate_incremental_batch
    ExerciseService.generate_incremental_batch = staticmethod(fake_generate_batch)
    try:
        added = []
        db = FakeDB(0, added)
        result = ExerciseService.add_next_incremental_batch(db, "de")
        assert result == 5
        assert len(added) == 5
    finally:
        ExerciseService.generate_incremental_batch = original


def test_fifteen_items_adds_five_to_close_session():
    original = ExerciseService.generate_incremental_batch
    ExerciseService.generate_incremental_batch = staticmethod(fake_generate_batch)
    try:
        added = []
        db = FakeDB(15, added)
        result = ExerciseService.add_next_incremental_batch(db, "de")
        assert result == 5
        assert len(added) == 5
    finally:
        ExerciseService.generate_incremental_batch = original


def test_sixteen_items_adds_four_to_close_session():
    original = ExerciseService.generate_incremental_batch
    ExerciseService.generate_incremental_batch = staticmethod(fake_generate_batch)
    try:
        added = []
        db = FakeDB(16, added)
        result = ExerciseService.add_next_incremental_batch(db, "de")
        assert result == 4
        assert len(added) == 4
    finally:
        ExerciseService.generate_incremental_batch = original


def test_nineteen_items_adds_one_to_close_session():
    original = ExerciseService.generate_incremental_batch
    ExerciseService.generate_incremental_batch = staticmethod(fake_generate_batch)
    try:
        added = []
        db = FakeDB(19, added)
        result = ExerciseService.add_next_incremental_batch(db, "de")
        assert result == 1
        assert len(added) == 1
    finally:
        ExerciseService.generate_incremental_batch = original


def test_twenty_items_adds_five_to_start_next_session():
    original = ExerciseService.generate_incremental_batch
    ExerciseService.generate_incremental_batch = staticmethod(fake_generate_batch)
    try:
        added = []
        db = FakeDB(20, added)
        result = ExerciseService.add_next_incremental_batch(db, "de")
        assert result == 5
        assert len(added) == 5
    finally:
        ExerciseService.generate_incremental_batch = original


def test_forty_items_adds_five_to_start_next_session():
    original = ExerciseService.generate_incremental_batch
    ExerciseService.generate_incremental_batch = staticmethod(fake_generate_batch)
    try:
        added = []
        db = FakeDB(40, added)
        result = ExerciseService.add_next_incremental_batch(db, "de")
        assert result == 5
        assert len(added) == 5
    finally:
        ExerciseService.generate_incremental_batch = original


def test_adds_at_most_five_when_under_fifteen():
    original = ExerciseService.generate_incremental_batch
    ExerciseService.generate_incremental_batch = staticmethod(fake_generate_batch)
    try:
        added = []
        db = FakeDB(10, added)
        result = ExerciseService.add_next_incremental_batch(db, "de")
        assert result == 5
        assert len(added) == 5
    finally:
        ExerciseService.generate_incremental_batch = original


if __name__ == "__main__":
    raise SystemExit(0)
