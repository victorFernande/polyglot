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
    assert after["stats"]["total_xp"] - before["stats"]["total_xp"] == expected_xp + 10
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

def test_first_step_achievement_unlocks_after_first_completed_exercise_session(tmp_path):
    client = make_client(tmp_path)
    user_id = client.post("/users/1/bootstrap").json()["id"]
    lesson = client.get("/exercise-lessons", params={"user_id": user_id}).json()[0]
    session = client.post(f"/exercise-lessons/{lesson['id']}/sessions", params={"user_id": user_id}).json()

    complete = client.post(f"/exercise-sessions/{session['id']}/complete")
    assert complete.status_code == 200, complete.text

    achievements = client.get(f"/users/{user_id}/achievements").json()
    first_step = next(item for item in achievements if item["code"] == "first_step")

    assert first_step["requirement_type"] == "exercise_sessions"
    assert first_step["earned"] is True


def test_seeded_achievements_use_supported_current_progress_requirements(tmp_path):
    client = make_client(tmp_path)
    user_id = client.post("/users/1/bootstrap").json()["id"]
    achievements = client.get(f"/users/{user_id}/achievements").json()

    supported = {"streak", "vocabulary", "exercise_sessions", "completed_languages"}
    assert {item["requirement_type"] for item in achievements} <= supported
    polyglot = next(item for item in achievements if item["code"] == "polyglot")
    assert polyglot["requirement_type"] == "completed_languages"
    assert polyglot["requirement_value"] == 5
    assert "5" in polyglot["description"]

def test_achievements_endpoint_refreshes_preexisting_completed_session_milestones(tmp_path):
    client = make_client(tmp_path)
    user_id = client.post("/users/1/bootstrap").json()["id"]
    lesson = client.get("/exercise-lessons", params={"user_id": user_id}).json()[0]

    modules = sys.modules
    models = modules["models"]
    db = models.SessionLocal()
    try:
        db.add(models.ExerciseSession(
            user_id=user_id,
            lesson_id=lesson["id"],
            status="completed",
            total_count=20,
            correct_count=20,
            session_number=1,
        ))
        db.commit()
    finally:
        db.close()

    achievements = client.get(f"/users/{user_id}/achievements").json()
    first_step = next(item for item in achievements if item["code"] == "first_step")

    assert first_step["earned"] is True

