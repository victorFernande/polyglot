import json
import os
import re
import tempfile
from pathlib import Path

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.NamedTemporaryFile(delete=False).name}"

from models import Base, engine, SessionLocal, ExerciseLesson, ExerciseItem  # noqa: E402
from services import ExerciseService  # noqa: E402
from curriculum import A1_UNITS  # noqa: E402


LANGUAGES = {"de", "fr", "ru", "jp", "en"}
ROOT = Path(__file__).resolve().parents[2]


METALINGUISTIC_MARKERS = {
    "de": ["das Wort "],
    "fr": ["le mot "],
    "ru": ["слово "],
    "jp": ["という言葉"],
    "en": ["the word "],
}

KANJI_RE = re.compile(r"[\u4e00-\u9fff]")
KANA_RE = re.compile(r"[\u3040-\u30ff]")
CYRILLIC_RE = re.compile(r"[\u0400-\u04ff]")


def _latest_cron_snapshot_path():
    import glob
    from pathlib import Path

    snapshots = glob.glob(
        str(Path(__file__).resolve().parents[2] / "reports" / "polyglot-cron" / "*-snapshot.json")
    )
    if not snapshots:
        raise FileNotFoundError("no cron snapshot found in reports/polyglot-cron/")
    # Use filesystem mtime rather than filename sorting so heterogeneous naming
    # conventions (e.g. 2026-07-03-161703 vs 2026-07-03T15-13-53) do not pick
    # an older snapshot by accident.
    return Path(max(snapshots, key=lambda p: Path(p).stat().st_mtime))


def test_add_next_incremental_batch_adds_up_to_five_items_and_respects_session_size():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ExerciseService.ensure_seed_lessons(db)
        for code in LANGUAGES:
            lesson = db.query(ExerciseLesson).filter(ExerciseLesson.language_code == code, ExerciseLesson.active == True).first()
            # Simulate an in-progress incremental state: remove all but 14 items so the
            # last session block is open. 14 -> add 5 (closes the block at 19).
            db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id).delete()
            db.flush()
            for n in range(1, 15):
                db.add(ExerciseItem(
                    lesson_id=lesson.id,
                    order_index=n,
                    type="choice",
                    prompt=f"placeholder {n}",
                    answer={"value": "x"},
                    options=["x", "y", "z"],
                    tiles=None,
                    pairs=None,
                    hint="h",
                    explanation="e",
                    xp_reward=8,
                ))
            db.commit()
            before = db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id).count()
            added = ExerciseService.add_next_incremental_batch(db, code)
            after = db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id).count()
            last_block = before % ExerciseService.SESSION_SIZE
            if last_block == 0:
                expected = min(5, ExerciseService.SESSION_SIZE)
            elif last_block <= 15:
                expected = min(5, ExerciseService.SESSION_SIZE - last_block)
            else:
                expected = ExerciseService.SESSION_SIZE - last_block
            assert added == expected, f"{code}: expected {expected} added, got {added}"
            assert after == before + expected, f"{code}: count before={before} after={after} expected={before+expected}"
            new_items = db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id, ExerciseItem.order_index > before).order_by(ExerciseItem.order_index).all()
            assert len(new_items) == expected
            assert all(item.type and item.prompt and item.answer for item in new_items)
    finally:
        db.close()




def test_japanese_progression_starts_with_romaji_then_kana_then_kanji():
    japanese_items = ExerciseService.generate_items("jp")
    romaji_window = japanese_items[:100]
    kana_window = japanese_items[100:200]
    kanji_window = japanese_items[200:300]

    rendered_romaji = json.dumps(romaji_window, ensure_ascii=False)
    rendered_kana = json.dumps(kana_window, ensure_ascii=False)
    rendered_kanji = json.dumps(kanji_window, ensure_ascii=False)

    assert romaji_window
    assert not KANJI_RE.search(rendered_romaji)
    assert not KANA_RE.search(rendered_romaji)
    assert "mizu o onegaishimasu" in rendered_romaji
    assert "okaikei o onegaishimasu" in rendered_romaji
    assert KANA_RE.search(rendered_kana)
    assert not KANJI_RE.search(rendered_kana)
    assert KANJI_RE.search(rendered_kanji)


def test_russian_progression_starts_with_latin_transliteration_then_cyrillic():
    russian_items = ExerciseService.generate_items("ru")
    latin_window = russian_items[:100]
    cyrillic_window = russian_items[100:200]

    rendered_latin = json.dumps(latin_window, ensure_ascii=False)
    rendered_cyrillic = json.dumps(cyrillic_window, ensure_ascii=False)

    assert latin_window
    assert not CYRILLIC_RE.search(rendered_latin)
    assert "vodu pozhaluysta" in rendered_latin
    assert "schyot pozhaluysta" in rendered_latin
    assert CYRILLIC_RE.search(rendered_cyrillic)


def test_latin_alphabet_languages_do_not_need_script_scaffolding():
    for language in {"de", "fr", "en"}:
        rendered = json.dumps(ExerciseService.generate_items(language)[:100], ensure_ascii=False)
        assert not CYRILLIC_RE.search(rendered)
        assert not KANA_RE.search(rendered)
        assert not KANJI_RE.search(rendered)


def test_seed_lessons_is_long_varied_and_idempotent():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ExerciseService.seed_lessons(db)
        db.commit()
        ExerciseService.seed_lessons(db)
        db.commit()

        lessons = db.query(ExerciseLesson).all()
        assert {lesson.language_code for lesson in lessons} == LANGUAGES

        for lesson in lessons:
            items = db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id).all()
            assert len(items) == ExerciseService.target_items_for_language(lesson.language_code)
            assert {item.type for item in items} >= {"choice", "listen_choice", "image_choice", "build", "context_choice", "match", "listen_match", "listen_build", "sequence_dialogue"}
            assert all(item.hint for item in items)
            assert all(item.explanation for item in items)
            assert any("Unidade 1/10 — Fazendo um pedido no café" in item.prompt for item in items)
            assert any("Unidade 2/10 — Apresente-se" in item.prompt for item in items)
            assert any("Unidade 10/10 — Exponha preferências" in item.prompt for item in items)
            assert any("Mini-aula" in item.hint for item in items)
            rendered = "\n".join(item.prompt + "\n" + repr(item.answer) + "\n" + repr(item.pairs) for item in items)
            assert "escolha como dizer “cidade”" not in rendered
            assert "identifique “clima”" not in rendered
            assert "['Ich mag diese Stadt.', 'cidade']" not in rendered
            assert "['Ich mag warmes Wetter.', 'clima']" not in rendered
            assert "['Ich finde das gut.', 'opinião']" not in rendered
            invalid_phrases = ["Ich will er", "Je veux il", "Я хочу он", "私 ほしい 彼", "I want he"]
            assert not any(
                bad in " ".join(item.answer.get("value", []))
                for item in items
                if item.type == "build"
                for bad in invalid_phrases
            )
            for item in items:
                if item.type == "choice":
                    assert item.answer["value"] in item.options
                elif item.type == "image_choice":
                    assert item.answer["value"] in [option["value"] for option in item.options]
                    assert len(item.options) == 4
                    assert all(option["label_pt"] for option in item.options)
                    assert all(option["display_text"] == option["value"] for option in item.options)
                    assert all(option["icon_key"] for option in item.options)
                    assert all(option["svg"].startswith("<svg") for option in item.options)
                    assert all("viewBox" in option["svg"] for option in item.options)
                    correct = next(option for option in item.options if option["value"] == item.answer["value"])
                    assert correct["label_pt"] in item.explanation
                elif item.type in {"build", "listen_build"}:
                    assert all(word in item.tiles for word in item.answer["value"])
                elif item.type == "sequence_dialogue":
                    assert len(item.answer["value"]) == 4
                    assert all(phrase in item.tiles for phrase in item.answer["value"])
                    assert item.options is None
                    assert item.pairs is None
                elif item.type in {"match", "listen_match"}:
                    assert item.answer["pairs"] == item.pairs
                    assert len(item.pairs) == 4
                    if item.type == "listen_match":
                        assert "ouça" in item.prompt.casefold()
                        assert "áudio" in item.hint.casefold()

        assert db.query(ExerciseLesson).count() == len(LANGUAGES)
        assert db.query(ExerciseItem).count() == sum(
            ExerciseService.target_items_for_language(language)
            for language in LANGUAGES
        )
    finally:
        db.close()


def test_seed_lessons_deactivates_legacy_prototype_lessons():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        legacy = ExerciseLesson(
            language_code="de",
            language_name="Alemão",
            slug="sobrevivencia-rammstein-01",
            title="Protótipo antigo",
            description="Lição curta antiga",
            order_index=1,
            active=True,
        )
        db.add(legacy)
        db.commit()

        ExerciseService.seed_lessons(db)

        active_lessons = db.query(ExerciseLesson).filter(ExerciseLesson.active == True).all()
        assert len(active_lessons) == len(LANGUAGES)
        assert {lesson.slug for lesson in active_lessons} == {
            "de-trilha-a1-situacional-1000",
            "fr-trilha-a1-situacional-1000",
            "ru-trilha-a1-situacional-1000",
            "jp-trilha-a1-situacional-1000",
            "en-trilha-a1-situacional-1000",
        }
        assert db.query(ExerciseLesson).filter(
            ExerciseLesson.slug == "sobrevivencia-rammstein-01",
            ExerciseLesson.active == True,
        ).count() == 0
    finally:
        db.close()


def test_generated_items_never_leak_answer_in_parentheses():
    for code in LANGUAGES:
        items = ExerciseService.generate_items(code)
        for item in items:
            prompt = item["prompt"]
            answer = item["answer"]
            if answer is None or not isinstance(answer, dict):
                continue
            value = answer.get("value")
            if value is None:
                continue
            if isinstance(value, list):
                value = " ".join(value)
            assert f"({value})" not in prompt, (
                f"{code}: answer leak in prompt: {prompt!r}"
            )


def test_generated_items_have_no_metalinguistic_vocabulary_fillers():
    for code in LANGUAGES:
        markers = METALINGUISTIC_MARKERS[code]
        items = ExerciseService.generate_items(code)
        for item in items:
            prompt = item["prompt"]
            for marker in markers:
                assert marker not in prompt, (
                    f"{code}: metalinguistic filler in prompt: {prompt!r}"
                )


def test_generated_sequence_dialogues_use_target_language_only():
    for code in LANGUAGES:
        items = ExerciseService.generate_items(code)
        for idx, item in enumerate(items, 1):
            if item["type"] != "sequence_dialogue":
                continue
            answer = item["answer"]
            assert answer is not None and isinstance(answer, dict)
            value = answer.get("value")
            assert value is not None
            assert all(isinstance(part, str) and part for part in value)
            # For languages whose script is not Latin, sequence dialogue must use the
            # target script. Japanese and Russian scaffold the first 100 items in
            # romaji/latin transliteration before introducing the target script.
            if code in {"de", "fr", "en"}:
                continue
            for part in value:
                if code == "jp" and idx <= 100:
                    continue
                if code == "ru" and idx <= 100:
                    continue
                assert not re.search(r"[A-Za-zà-úÀ-Ú]+\s+[A-Za-zà-úÀ-Ú]+", part) or part in set(), f"{code}: sequence dialogue contains non-target text: {part!r}"


def test_generated_items_have_positive_xp():
    for code in LANGUAGES:
        items = ExerciseService.generate_items(code)
        for item in items:
            assert isinstance(item["xp_reward"], int) and item["xp_reward"] > 0, (
                f"{code}: item missing positive xp: {item}"
            )


def test_generated_items_have_required_fields():
    for code in LANGUAGES:
        items = ExerciseService.generate_items(code)
        for item in items:
            assert item["type"] and item["prompt"] and item["answer"] is not None
            assert item["hint"] and item["explanation"]
            assert item["xp_reward"] > 0


def test_lesson_counts_match_incremental_targets():
    for code in LANGUAGES:
        items = ExerciseService.generate_items(code)
        target = ExerciseService.target_items_for_language(code)
        assert len(items) == target, f"{code}: expected {target} items, got {len(items)}"


def test_add_next_incremental_batch_keeps_growing_after_static_target():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ExerciseService.ensure_seed_lessons(db)
        for code in LANGUAGES:
            added1 = ExerciseService.add_next_incremental_batch(db, code)
            assert added1 == 5, f"{code}: first batch after static target should add 5, got {added1}"
            added2 = ExerciseService.add_next_incremental_batch(db, code)
            assert added2 == 5, f"{code}: second batch should continue toward next session boundary, got {added2}"
    finally:
        db.close()


def test_ensure_seed_lessons_preserves_incremental_items_beyond_target():
    """Cron items added beyond the original target must never be deleted by ensure_seed_lessons."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ExerciseService.ensure_seed_lessons(db)
        for code in LANGUAGES:
            lesson = db.query(ExerciseLesson).filter(
                ExerciseLesson.language_code == code, ExerciseLesson.active == True
            ).first()
            target = ExerciseService.target_items_for_language(code)
            # Simulate a previous cron round that added 5 extra items.
            for extra in range(1, 6):
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

        ExerciseService.ensure_seed_lessons(db)
        db.commit()

        for code in LANGUAGES:
            lesson = db.query(ExerciseLesson).filter(
                ExerciseLesson.language_code == code, ExerciseLesson.active == True
            ).first()
            target = ExerciseService.target_items_for_language(code)
            items = db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id).all()
            assert len(items) >= target + 5, (
                f"{code}: expected at least {target + 5} items after ensure_seed_lessons, got {len(items)}"
            )
    finally:
        db.close()


def test_real_database_cron_round_uses_latest_snapshot():
    """Validate the real production DB against the latest cron snapshot.

    The snapshot records the ExerciseItem count for each active language before
    this cron round. After running the incremental script, every language must
    have grown by exactly the expected batch size (up to 5) and no session
    block may exceed SESSION_SIZE.
    """
    import importlib

    snapshot_path = _latest_cron_snapshot_path()
    with snapshot_path.open() as f:
        raw_counts = json.load(f)
    # New snapshots include both before/after; older snapshots were flat.
    before_counts = raw_counts.get("before", raw_counts)

    os.environ["DATABASE_URL"] = f"sqlite:///{ROOT / 'docker' / 'backend' / 'polyglot.db'}"
    import models
    importlib.reload(models)
    Base = models.Base
    engine = models.engine
    SessionLocal = models.SessionLocal
    ExerciseLesson = models.ExerciseLesson
    ExerciseItem = models.ExerciseItem

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for code in LANGUAGES:
            lesson = (
                db.query(ExerciseLesson)
                .filter(ExerciseLesson.language_code == code, ExerciseLesson.active == True)
                .first()
            )
            assert lesson, f"no active lesson for {code}"
            before = before_counts[code]
            after = db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id).count()
            target = ExerciseService.dynamic_target_for_language(code, before)
            remaining_to_target = target - before
            last_block = before % ExerciseService.SESSION_SIZE
            per_language_limit = raw_counts.get("per_language_limit", 100)
            expected = 0
            simulated_count = before
            while expected < per_language_limit:
                remaining_to_target = target - simulated_count
                if remaining_to_target <= 0:
                    break
                last_block = simulated_count % ExerciseService.SESSION_SIZE
                if last_block == 0:
                    step = min(per_language_limit - expected, ExerciseService.SESSION_SIZE, remaining_to_target)
                elif last_block <= 15:
                    step = min(per_language_limit - expected, ExerciseService.SESSION_SIZE - last_block, remaining_to_target)
                else:
                    step = min(per_language_limit - expected, ExerciseService.SESSION_SIZE - last_block, remaining_to_target)
                if step <= 0:
                    break
                expected += step
                simulated_count += step
            assert after == before + expected, (
                f"{code}: expected {before + expected} items after cron, got {after}"
            )

            new_items = (
                db.query(ExerciseItem)
                .filter(ExerciseItem.lesson_id == lesson.id, ExerciseItem.order_index > before)
                .order_by(ExerciseItem.order_index)
                .all()
            )
            assert len(new_items) == expected, (
                f"{code}: expected {expected} new items, got {len(new_items)}"
            )
            assert all(item.type and item.prompt and item.answer for item in new_items), (
                f"{code}: new item missing required fields"
            )
            assert all(isinstance(item.xp_reward, (int, float)) and item.xp_reward > 0 for item in new_items), (
                f"{code}: new item missing positive XP"
            )
    finally:
        db.close()
