import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.NamedTemporaryFile(delete=False).name}"

from models import Base, engine, SessionLocal, ExerciseLesson, ExerciseItem  # noqa: E402
from services import ExerciseService  # noqa: E402


def test_seed_lessons_is_long_varied_and_idempotent():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ExerciseService.seed_lessons(db)
        db.commit()
        ExerciseService.seed_lessons(db)
        db.commit()

        lessons = db.query(ExerciseLesson).all()
        assert {lesson.language_code for lesson in lessons} == {"de", "fr", "ru", "jp"}

        for lesson in lessons:
            items = db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id).all()
            assert len(items) >= 12
            assert {item.type for item in items} >= {"choice", "build", "match"}
            assert all(item.hint for item in items)
            assert all(item.explanation for item in items)

        assert db.query(ExerciseLesson).count() == 4
        assert db.query(ExerciseItem).count() == 48
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
        assert len(active_lessons) == 4
        assert {lesson.slug for lesson in active_lessons} == {
            "de-primeiros-contatos",
            "fr-primeiros-contatos",
            "ru-primeiros-contatos",
            "jp-primeiros-contatos",
        }
        db.refresh(legacy)
        assert legacy.active is False
    finally:
        db.close()
