import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.NamedTemporaryFile(delete=False).name}"

from models import Base, engine, SessionLocal, ExerciseLesson, ExerciseItem  # noqa: E402
from services import ExerciseService  # noqa: E402


LANGUAGES = {"de", "fr", "ru", "jp", "en"}


def test_seed_lessons_is_long_varied_and_idempotent():
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
            assert len(items) == ExerciseService.TARGET_ITEMS
            assert {item.type for item in items} >= {"choice", "build", "match"}
            assert all(item.hint for item in items)
            assert all(item.explanation for item in items)
            for item in items:
                if item.type == "choice":
                    assert item.answer["value"] in item.options
                elif item.type == "build":
                    assert all(word in item.tiles for word in item.answer["value"])
                elif item.type == "match":
                    assert item.answer["pairs"] == item.pairs
                    assert len(item.pairs) == 4

        assert db.query(ExerciseLesson).count() == len(LANGUAGES)
        assert db.query(ExerciseItem).count() == len(LANGUAGES) * ExerciseService.TARGET_ITEMS
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
            "de-trilha-100",
            "fr-trilha-100",
            "ru-trilha-100",
            "jp-trilha-100",
            "en-trilha-100",
        }
        db.refresh(legacy)
        assert legacy.active is False
    finally:
        db.close()


def test_matching_payload_from_frontend_is_accepted_for_german_fundamentals():
    expected_pairs = [["Bitte", "por favor"], ["Ja", "sim"], ["Nein", "não"], ["Wasser", "água"]]
    frontend_payload = {left: right for left, right in expected_pairs}
    canonical_answer = {"pairs": expected_pairs}

    assert ExerciseService.normalize(frontend_payload) == ExerciseService.normalize(canonical_answer)
