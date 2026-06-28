import importlib
import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient


def ui_payload_for_item(item):
    if item["type"] == "choice":
        return item["answer"]["value"]
    if item["type"] == "build":
        return item["answer"]["value"]
    if item["type"] == "match":
        return {left: right for left, right in item["answer"]["pairs"]}
    return item["answer"]


def make_client(tmp_path):
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_path / 'polyglot-test.db'}"
    for name in ["main", "services", "schemas", "models"]:
        sys.modules.pop(name, None)
    main = importlib.import_module("main")
    main.startup()
    return TestClient(main.app)


def test_completing_exercise_session_updates_gamification_once(tmp_path):
    client = make_client(tmp_path)

    bootstrap = client.post("/users/1/bootstrap").json()
    user_id = bootstrap["id"]
    lessons = client.get("/exercise-lessons", params={"user_id": user_id}).json()
    lesson = next(item for item in lessons if item["language"] == "de")

    session = client.post(f"/exercise-lessons/{lesson['id']}/sessions", params={"user_id": user_id}).json()
    session_id = session["id"]
    detail = client.get(f"/exercise-sessions/{session_id}").json()

    expected_xp = 0
    for item in detail["items"][:3]:
        response = client.post(
            f"/exercise-sessions/{session_id}/answer",
            json={"item_id": item["id"], "payload": ui_payload_for_item(item)},
        )
        assert response.status_code == 200, response.text
        assert response.json()["is_correct"] is True
        expected_xp += item["xp_reward"]

    before = client.get(f"/users/{user_id}/dashboard").json()
    first = client.post(f"/exercise-sessions/{session_id}/complete").json()
    second = client.post(f"/exercise-sessions/{session_id}/complete").json()
    after = client.get(f"/users/{user_id}/dashboard").json()

    assert first["status"] == "completed"
    assert first["xp_earned"] == expected_xp
    assert second["already_completed"] is True
    assert second["xp_earned"] == first["xp_earned"]
    assert after["stats"]["total_xp"] - before["stats"]["total_xp"] == expected_xp
    assert after["stats"]["current_streak"] >= 1
    assert after["stats"]["vocabulary_count"] >= first["vocabulary_added"]
    assert after["stats"]["phrases_count"] >= first["phrases_added"]

    logs = client.get(f"/users/{user_id}/logs").json()
    exercise_logs = [log for log in logs if log["activity_type"] == "srs" and f"sessão {session_id}" in (log["notes"] or "")]
    assert len(exercise_logs) == 1
    assert exercise_logs[0]["xp_earned"] == expected_xp


def test_completing_unanswered_session_is_idempotent_zero_xp(tmp_path):
    client = make_client(tmp_path)
    user_id = client.post("/users/1/bootstrap").json()["id"]
    lesson = client.get("/exercise-lessons", params={"user_id": user_id}).json()[0]
    session_id = client.post(f"/exercise-lessons/{lesson['id']}/sessions", params={"user_id": user_id}).json()["id"]

    first = client.post(f"/exercise-sessions/{session_id}/complete").json()
    second = client.post(f"/exercise-sessions/{session_id}/complete").json()

    assert first["xp_earned"] == 0
    assert first["correct_count"] == 0
    assert second["already_completed"] is True
    assert second["xp_earned"] == 0
