import importlib.util
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "docker" / "backend"
CRON = BACKEND / "cron_incremental.py"
REVIEW_TOOL = ROOT / "shared" / "tools" / "polyglot_agent_review.py"

sys.path.insert(0, str(BACKEND))

from services import ExerciseService  # noqa: E402

# Load the local QA review tool without depending on the active interpreter's sys.path.
_polyglot_agent_review_spec = importlib.util.spec_from_file_location(
    "polyglot_agent_review", REVIEW_TOOL
)
_polyglot_agent_review = importlib.util.module_from_spec(_polyglot_agent_review_spec)
_polyglot_agent_review_spec.loader.exec_module(_polyglot_agent_review)
review_item = _polyglot_agent_review.review_item
add_repetition_verdicts = _polyglot_agent_review.add_repetition_verdicts

LANGUAGES = ["de", "fr", "ru", "jp", "en"]


def run_cron(
    database_url: str,
    snapshot_dir: str,
    bootstrap: bool = False,
    commit: bool = False,
) -> subprocess.CompletedProcess:
    env = {
        **os.environ,
        "DATABASE_URL": database_url,
    }
    args = [str(BACKEND / ".venv" / "bin" / "python"), str(CRON), "--database-url", database_url, "--snapshot-dir", snapshot_dir]
    if bootstrap:
        args.append("--bootstrap")
    if commit:
        args.append("--commit")
    return subprocess.run(args, capture_output=True, text=True, env=env, cwd=str(BACKEND))


def bootstrap_db(database_url: str) -> None:
    run_cron(database_url, str(tempfile.mkdtemp()), bootstrap=True).check_returncode()


def delete_last_n_items(database_url: str, n: int) -> None:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from models import Base, ExerciseLesson, ExerciseItem

    engine = create_engine(database_url)
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    try:
        for code in LANGUAGES:
            lesson = db.query(ExerciseLesson).filter(
                ExerciseLesson.language_code == code, ExerciseLesson.active == True
            ).first()
            assert lesson, f"missing active lesson for {code}"
            items = (
                db.query(ExerciseItem)
                .filter(ExerciseItem.lesson_id == lesson.id)
                .order_by(ExerciseItem.order_index.desc())
                .limit(n)
                .all()
            )
            for item in items:
                db.delete(item)
        db.commit()
    finally:
        db.close()


def item_counts(database_url: str) -> dict[str, int]:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from models import Base, ExerciseLesson, ExerciseItem

    engine = create_engine(database_url)
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    try:
        counts = {}
        for code in LANGUAGES:
            lesson = db.query(ExerciseLesson).filter(
                ExerciseLesson.language_code == code, ExerciseLesson.active == True
            ).first()
            counts[code] = (
                db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id).count()
                if lesson
                else 0
            )
        return counts
    finally:
        db.close()


def expected_batch_size(before: int) -> int:
    last_block = before % ExerciseService.SESSION_SIZE
    if last_block == 0:
        return min(5, ExerciseService.SESSION_SIZE)
    elif last_block <= 15:
        return min(5, ExerciseService.SESSION_SIZE - last_block)
    else:
        return ExerciseService.SESSION_SIZE - last_block


def test_cron_incremental_creates_snapshot_and_adds_items():
    db_path = Path(tempfile.NamedTemporaryFile(delete=False, suffix=".db").name)
    snapshot_dir = Path(tempfile.mkdtemp())
    database_url = f"sqlite:///{db_path}"

    try:
        bootstrap_db(database_url)
        delete_last_n_items(database_url, 6)
        before = item_counts(database_url)

        result = run_cron(database_url, str(snapshot_dir))
        assert result.returncode == 0, result.stderr

        after = item_counts(database_url)
        snapshots = sorted(snapshot_dir.glob("*-snapshot.json"))
        assert len(snapshots) == 1, f"expected one snapshot, got {len(snapshots)}"
        payload = json.loads(snapshots[0].read_text())
        for code in LANGUAGES:
            expected = expected_batch_size(before[code])
            assert after[code] == before[code] + expected, (
                f"{code}: expected {before[code] + expected} items, got {after[code]}"
            )
            assert payload["before"][code] == before[code]
            assert payload["after"][code] == after[code]
    finally:
        db_path.unlink(missing_ok=True)


def test_cron_incremental_exposes_commit_flag_without_staging_unrelated_paths():
    source = CRON.read_text(encoding="utf-8")

    assert '"--commit"' in source
    assert '"--commit-db"' in source
    assert 'subprocess.run(["git", "add", "--", *paths]' in source
    assert 'subprocess.run(["git", "commit", "-m", message]' in source
    assert 'git_has_changes(paths)' in source


def test_cron_incremental_grows_at_static_target():
    """Once the canonical static target is reached, the cron must keep growing
    toward the next session boundary instead of becoming idempotent at 0."""
    db_path = Path(tempfile.NamedTemporaryFile(delete=False, suffix=".db").name)
    snapshot_dir = Path(tempfile.mkdtemp())
    database_url = f"sqlite:///{db_path}"

    try:
        bootstrap_db(database_url)
        before = item_counts(database_url)
        for code in LANGUAGES:
            assert before[code] == ExerciseService.target_items_for_language(code)

        result1 = run_cron(database_url, str(snapshot_dir))
        assert result1.returncode == 0, result1.stderr
        after1 = item_counts(database_url)
        for code in LANGUAGES:
            expected = expected_batch_size(before[code])
            assert after1[code] == before[code] + expected, (
                f"{code}: expected {before[code] + expected} items at static target, got {after1[code]}"
            )

        result2 = run_cron(database_url, str(snapshot_dir))
        assert result2.returncode == 0, result2.stderr
        after2 = item_counts(database_url)
        for code in LANGUAGES:
            expected = expected_batch_size(after1[code])
            assert after2[code] == after1[code] + expected, (
                f"{code}: expected second run to add {expected}, got {after2[code]}"
            )
    finally:
        db_path.unlink(missing_ok=True)


def test_cron_incremental_respects_session_boundary_after_static_target():
    """Beyond the static target, the cron still caps additions to the current
    20-item session block. A block with 16-19 items is only filled to 20."""
    db_path = Path(tempfile.NamedTemporaryFile(delete=False, suffix=".db").name)
    database_url = f"sqlite:///{db_path}"

    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from models import Base, ExerciseLesson, ExerciseItem

        engine = create_engine(database_url)
        Base.metadata.create_all(bind=engine)
        db = sessionmaker(bind=engine)()
        try:
            ExerciseService.ensure_seed_lessons(db)
            for code in LANGUAGES:
                lesson = db.query(ExerciseLesson).filter(
                    ExerciseLesson.language_code == code, ExerciseLesson.active == True
                ).first()
                target = ExerciseService.target_items_for_language(code)
                # 1250 + 6 items -> count 1256, last block size 16, dynamic target 1280,
                # so only 4 items should be added to close the block at 20.
                for extra in range(1, 7):
                    db.add(ExerciseItem(
                        lesson_id=lesson.id,
                        order_index=target + extra,
                        type="choice",
                        prompt="extra",
                        answer={"value": "x"},
                        options=["x", "y", "z"],
                        tiles=None,
                        pairs=None,
                        hint="h",
                        explanation="e",
                        xp_reward=8,
                    ))
                db.commit()
                added = ExerciseService.add_next_incremental_batch(db, code)
                assert added == 4, f"{code}: expected 4 items to close block, got {added}"
        finally:
            db.close()
    finally:
        db_path.unlink(missing_ok=True)


def test_incremental_targets_are_within_generator_capacity():
    """The per-language target must not exceed the number of items the generator can produce."""
    for code in LANGUAGES:
        target = ExerciseService.target_items_for_language(code)
        generated = ExerciseService.generate_items(code)
        assert len(generated) >= target, f"{code}: target {target} exceeds generator capacity {len(generated)}"


def test_cron_items_pass_qa_review():
    db_path = Path(tempfile.NamedTemporaryFile(delete=False, suffix=".db").name)
    snapshot_dir = Path(tempfile.mkdtemp())
    database_url = f"sqlite:///{db_path}"

    try:
        bootstrap_db(database_url)
        delete_last_n_items(database_url, 6)
        run_cron(database_url, str(snapshot_dir))

        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from models import Base, ExerciseLesson, ExerciseItem

        engine = create_engine(database_url)
        Base.metadata.create_all(bind=engine)
        db = sessionmaker(bind=engine)()
        try:
            rows = []
            for code in LANGUAGES:
                lesson = db.query(ExerciseLesson).filter(
                    ExerciseLesson.language_code == code, ExerciseLesson.active == True
                ).first()
                assert lesson
                items = (
                    db.query(ExerciseItem)
                    .filter(ExerciseItem.lesson_id == lesson.id)
                    .order_by(ExerciseItem.order_index.desc())
                    .limit(5)
                    .all()
                )
                for item in reversed(items):
                    payload = ExerciseService.item_payload(item)
                    rows.append(review_item(code, item.order_index - 1, payload))
            rows = add_repetition_verdicts(rows)
            blockers = [row for row in rows if row["verdict"] == "BLOCK"]
            assert not blockers, f"QA review BLOCKed newly created items: {blockers[:3]}"
        finally:
            db.close()
    finally:
        db_path.unlink(missing_ok=True)
