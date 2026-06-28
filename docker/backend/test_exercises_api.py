import os
from pathlib import Path

TEST_DB = Path(__file__).with_name("test_polyglot_exercises.db")
if TEST_DB.exists():
    TEST_DB.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402


def test_bootstrap_lists_lessons_and_persists_full_session_flow():
    with TestClient(app) as client:
        bootstrap = client.post("/users/1/bootstrap")
        assert bootstrap.status_code == 200, bootstrap.text
        boot_payload = bootstrap.json()
        assert boot_payload["user"]["id"] == 1
        assert boot_payload["lessons_count"] == 5

        lessons_response = client.get("/exercise-lessons", params={"user_id": 1})
        assert lessons_response.status_code == 200, lessons_response.text
        lessons = lessons_response.json()
        assert len(lessons) == 5
        assert {lesson["language"] for lesson in lessons} == {"de", "fr", "ru", "jp", "en"}
        assert all(lesson["items_count"] == 100 for lesson in lessons)

        lesson_id = lessons[0]["id"]
        session_response = client.post(f"/exercise-lessons/{lesson_id}/sessions", params={"user_id": 1})
        assert session_response.status_code == 200, session_response.text
        session = session_response.json()
        assert session["status"] == "in_progress"
        assert session["total_count"] >= 1
        assert session["current_item"] is not None

        item = session["current_item"]
        answer_response = client.post(
            f"/exercise-sessions/{session['id']}/answer",
            json={"item_id": item["id"], "payload": item["answer"]},
        )
        assert answer_response.status_code == 200, answer_response.text
        answer = answer_response.json()
        assert answer["is_correct"] is True
        assert answer["session"]["correct_count"] == 1
        assert answer["session"]["current_index"] == 1

        complete_response = client.post(f"/exercise-sessions/{session['id']}/complete")
        assert complete_response.status_code == 200, complete_response.text
        complete = complete_response.json()
        assert complete["status"] == "completed"
        assert complete["correct_count"] == 1
        assert complete["xp_earned"] >= item["xp_reward"]

        repeat_response = client.post(f"/exercise-sessions/{session['id']}/complete")
        assert repeat_response.status_code == 200, repeat_response.text
        repeated = repeat_response.json()
        assert repeated["already_completed"] is True
        assert repeated["xp_earned"] == complete["xp_earned"]
        assert repeated["correct_count"] == complete["correct_count"]
