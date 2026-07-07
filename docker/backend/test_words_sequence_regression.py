import json
import os
import re
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.NamedTemporaryFile(delete=False).name}"

from models import Base, engine, SessionLocal, ExerciseLesson, ExerciseItem, ExerciseSession  # noqa: E402
from services import ExerciseService  # noqa: E402


def test_words_endpoint_includes_sequence_phrases_as_learned_words():
    """Regression: sequence_dialogue answers stored as plain dicts must split
    into short phrase translations in /users/{id}/words."""
    from fastapi.testclient import TestClient
    from main import app, SessionLocal

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    user_id = 94010
    with TestClient(app) as client:
        client.post(f"/users/{user_id}/bootstrap")
        lesson = next(
            lesson
            for lesson in client.get("/exercise-lessons", params={"user_id": user_id}).json()
            if lesson["language_code"] == "de"
        )
        db = SessionLocal()
        try:
            # Force a sequence item containing the exact phrases the endpoint test expects
            seq_item = db.query(ExerciseItem).filter(
                ExerciseItem.lesson_id == lesson["id"],
                ExerciseItem.type == "sequence_dialogue",
            ).first()
            assert seq_item is not None
            seq_item.answer = {
                "value": [
                    "Ja, das stimmt.",
                    "Auf Wiedersehen.",
                    "Hallo",
                    "Ich möchte einen Kaffee.",
                ]
            }
            db.add(
                ExerciseSession(
                    user_id=user_id,
                    lesson_id=lesson["id"],
                    status="completed",
                    total_count=20,
                    correct_count=20,
                    session_number=1,
                )
            )
            db.commit()
        finally:
            db.close()

        payload = client.get(f"/users/{user_id}/words").json()
        rows = {word["word"]: word["translation_pt"] for word in payload["words"]}

        assert rows.get("Ja, das stimmt.") == "Sim, está certo."
        assert rows.get("Auf Wiedersehen.") == "Até logo."
