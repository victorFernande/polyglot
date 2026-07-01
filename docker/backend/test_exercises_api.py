import os
from datetime import datetime, timedelta
from pathlib import Path

TEST_DB = Path(__file__).with_name("test_polyglot_exercises.db")
if TEST_DB.exists():
    TEST_DB.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402
from models import ExerciseItem, ExerciseLesson, ExerciseSession, SessionLocal  # noqa: E402
from services import ExerciseService  # noqa: E402


def ui_payload(item):
    if item["type"] == "choice":
        return item["answer"]["value"]
    if item["type"] == "build":
        return item["answer"]["value"]
    if item["type"] == "match":
        return {left: right for left, right in item["answer"]["pairs"]}
    return item["answer"]


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
        assert {lesson["language_code"]: lesson["items_count"] for lesson in lessons} == {
            "de": ExerciseService.target_items_for_language("de"),
            "fr": ExerciseService.target_items_for_language("fr"),
            "ru": ExerciseService.target_items_for_language("ru"),
            "jp": ExerciseService.target_items_for_language("jp"),
            "en": ExerciseService.target_items_for_language("en"),
        }

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
        assert len(answer["session"]["items"]) == answer["session"]["total_count"]

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


def test_wrong_answer_records_mistake_advances_and_returns_teaching_feedback():
    with TestClient(app) as client:
        user_id = 93001
        client.post(f"/users/{user_id}/bootstrap")
        lesson = client.get("/exercise-lessons", params={"user_id": user_id}).json()[0]
        session = client.post(f"/exercise-lessons/{lesson['id']}/sessions", params={"user_id": user_id}).json()
        item = session["current_item"]

        response = client.post(
            f"/exercise-sessions/{session['id']}/answer",
            json={"item_id": item["id"], "payload": "resposta errada"},
        )

        assert response.status_code == 200, response.text
        result = response.json()
        assert result["is_correct"] is False
        assert result["session"]["hearts_left"] == session["hearts_left"] - 1
        assert result["session"]["correct_count"] == 0
        assert result["session"]["current_index"] == 1
        assert len(result["session"]["items"]) == result["session"]["total_count"]
        assert result["mistake_feedback"]["your_answer"] == "resposta errada"
        assert result["mistake_feedback"]["correct_answer"] == result["correct_answer"]
        assert "Você respondeu" in result["mistake_feedback"]["message"]
        assert "Resposta correta" in result["mistake_feedback"]["message"]
        assert result["mistake_feedback"]["explanation"]


def test_starting_after_exhausted_session_returns_next_20_item_session():
    with TestClient(app) as client:
        user_id = 93011
        client.post(f"/users/{user_id}/bootstrap")
        lesson = client.get("/exercise-lessons", params={"user_id": user_id}).json()[0]
        session = client.post(f"/exercise-lessons/{lesson['id']}/sessions", params={"user_id": user_id}).json()
        first_session_id = session["id"]
        first_item_ids = [item["id"] for item in session["items"]]

        for _ in range(session["total_count"]):
            item = session["items"][session["current_index"]]
            result = client.post(
                f"/exercise-sessions/{session['id']}/answer",
                json={"item_id": item["id"], "payload": ui_payload(item)},
            )
            assert result.status_code == 200, result.text
            session = result.json()["session"]

        assert session["current_index"] == session["total_count"]
        assert session["status"] == "in_progress"

        next_session = client.post(f"/exercise-lessons/{lesson['id']}/sessions", params={"user_id": user_id}).json()

        assert next_session["id"] != first_session_id
        assert next_session["status"] == "in_progress"
        assert next_session["current_index"] == 0
        assert next_session["current_item"] is not None
        assert len(next_session["items"]) == next_session["total_count"] == 20
        assert [item["id"] for item in next_session["items"]] != first_item_ids


def test_can_start_a_specific_previous_session_window_without_using_real_user():
    with TestClient(app) as client:
        user_id = 93021
        client.post(f"/users/{user_id}/bootstrap")
        lesson = client.get("/exercise-lessons", params={"user_id": user_id}).json()[0]
        full_lesson = client.get(f"/exercise-lessons/{lesson['id']}").json()

        session = client.post(
            f"/exercise-lessons/{lesson['id']}/sessions",
            params={"user_id": user_id, "session_number": 4},
        )

        assert session.status_code == 200, session.text
        payload = session.json()
        assert payload["session_number"] == 4
        assert [item["id"] for item in payload["items"]] == [item["id"] for item in full_lesson["items"][60:80]]

        same_session = client.post(
            f"/exercise-lessons/{lesson['id']}/sessions",
            params={"user_id": user_id, "session_number": 4},
        ).json()
        assert same_session["id"] == payload["id"]


def test_sessions_can_grow_beyond_initial_lesson_window_count_without_wrapping_numbers():
    with TestClient(app) as client:
        user_id = 93031
        client.post(f"/users/{user_id}/bootstrap")
        lesson = client.get("/exercise-lessons", params={"user_id": user_id}).json()[0]

        db = SessionLocal()
        try:
            for number in range(1, lesson["total_sessions"] + 1):
                db.add(ExerciseSession(
                    user_id=user_id,
                    lesson_id=lesson["id"],
                    status="completed",
                    session_number=number,
                    total_count=ExerciseService.SESSION_SIZE,
                    current_index=ExerciseService.SESSION_SIZE,
                ))
            db.commit()
        finally:
            db.close()

        grown_lesson = client.get("/exercise-lessons", params={"user_id": user_id}).json()[0]
        next_session = client.post(f"/exercise-lessons/{lesson['id']}/sessions", params={"user_id": user_id}).json()

        assert grown_lesson["total_sessions"] == lesson["total_sessions"] + 1
        assert next_session["session_number"] == lesson["total_sessions"] + 1
        assert len(next_session["items"]) == next_session["total_count"] == 20


def test_legacy_10_question_in_progress_session_expands_to_current_20_question_window():
    with TestClient(app) as client:
        user_id = 93041
        client.post(f"/users/{user_id}/bootstrap")
        lesson = client.get("/exercise-lessons", params={"user_id": user_id}).json()[0]

        db = SessionLocal()
        try:
            legacy = ExerciseSession(
                user_id=user_id,
                lesson_id=lesson["id"],
                status="in_progress",
                session_number=16,
                total_count=10,
                current_index=1,
            )
            db.add(legacy)
            db.commit()
        finally:
            db.close()

        resumed = client.post(f"/exercise-lessons/{lesson['id']}/sessions", params={"user_id": user_id}).json()

        assert resumed["session_number"] == 16
        assert resumed["current_index"] == 1
        assert len(resumed["items"]) == resumed["total_count"] == 20
        assert resumed["current_item"] == resumed["items"][1]


def test_opening_previous_session_does_not_replace_highest_active_session_on_refresh():
    with TestClient(app) as client:
        user_id = 93051
        client.post(f"/users/{user_id}/bootstrap")
        lesson = client.get("/exercise-lessons", params={"user_id": user_id}).json()[0]

        db = SessionLocal()
        try:
            db.add(ExerciseSession(user_id=user_id, lesson_id=lesson["id"], status="in_progress", session_number=16, total_count=20, current_index=1))
            db.commit()
        finally:
            db.close()

        previous = client.post(f"/exercise-lessons/{lesson['id']}/sessions", params={"user_id": user_id, "session_number": 15}).json()
        refreshed_default = client.post(f"/exercise-lessons/{lesson['id']}/sessions", params={"user_id": user_id}).json()

        assert previous["session_number"] == 15
        assert refreshed_default["session_number"] == 16
        assert refreshed_default["current_index"] == 1
        assert len(refreshed_default["items"]) == refreshed_default["total_count"] == 20


def test_next_session_ignores_lower_previous_session_opened_for_review():
    with TestClient(app) as client:
        user_id = 93052
        client.post(f"/users/{user_id}/bootstrap")
        lesson = client.get("/exercise-lessons", params={"user_id": user_id}).json()[0]

        db = SessionLocal()
        try:
            db.add(ExerciseSession(user_id=user_id, lesson_id=lesson["id"], status="in_progress", session_number=15, total_count=20, current_index=1))
            db.add(ExerciseSession(user_id=user_id, lesson_id=lesson["id"], status="completed", session_number=16, total_count=20, current_index=20))
            db.commit()
        finally:
            db.close()

        next_session = client.post(f"/exercise-lessons/{lesson['id']}/sessions", params={"user_id": user_id}).json()

        assert next_session["session_number"] == 17
        assert next_session["current_index"] == 0
        assert len(next_session["items"]) == next_session["total_count"] == 20


def test_bootstrap_allows_independent_test_users():
    with TestClient(app) as client:
        first = client.post("/users/91001/bootstrap")
        second = client.post("/users/91002/bootstrap")

        assert first.status_code == 200, first.text
        assert second.status_code == 200, second.text
        assert first.json()["user"]["email"] != second.json()["user"]["email"]


def test_image_choice_can_be_played_by_separate_test_user_without_touching_user_one():
    with TestClient(app) as client:
        user_id = 99991
        before_user_one = client.get("/exercise-lessons", params={"user_id": 1}).json()[0]
        bootstrap = client.post(f"/users/{user_id}/bootstrap")
        assert bootstrap.status_code == 200, bootstrap.text
        assert bootstrap.json()["user"]["id"] == user_id

        lesson = client.get("/exercise-lessons", params={"user_id": user_id}).json()[0]
        session = client.post(f"/exercise-lessons/{lesson['id']}/sessions", params={"user_id": user_id}).json()
        assert session["user_id"] == user_id
        assert session["current_index"] == 0

        while session["current_item"]["type"] != "image_choice":
            item = session["current_item"]
            response = client.post(
                f"/exercise-sessions/{session['id']}/answer",
                json={"item_id": item["id"], "payload": ui_payload(item)},
            )
            assert response.status_code == 200, response.text
            session = response.json()["session"]

        image_item = session["current_item"]
        assert image_item["type"] == "image_choice"
        assert len(image_item["options"]) == 4
        assert all(option.get("label_pt") for option in image_item["options"])
        assert all(option.get("value") for option in image_item["options"])
        assert all(option.get("image_src", "").startswith("data:image/svg+xml") for option in image_item["options"])

        chosen = image_item["answer"]["value"]
        answer = client.post(
            f"/exercise-sessions/{session['id']}/answer",
            json={"item_id": image_item["id"], "payload": chosen},
        )
        assert answer.status_code == 200, answer.text
        assert answer.json()["is_correct"] is True
        assert answer.json()["session"]["user_id"] == user_id

        after_user_one = client.get("/exercise-lessons", params={"user_id": 1}).json()[0]
        assert after_user_one["completed_sessions"] == before_user_one["completed_sessions"]
        assert after_user_one["active_session_id"] == before_user_one["active_session_id"]

def test_dashboard_reports_active_language_progress_across_1000_exercises():
    user_id = 94002
    with TestClient(app) as client:
        client.post(f"/users/{user_id}/bootstrap")
        lessons = client.get("/exercise-lessons", params={"user_id": user_id}).json()
        german = next(lesson for lesson in lessons if lesson["language_code"] == "de")

        db = SessionLocal()
        try:
            db.query(ExerciseSession).filter(ExerciseSession.user_id == user_id).delete()
            db.commit()
            for number in range(1, 26):
                db.add(ExerciseSession(
                    user_id=user_id,
                    lesson_id=german["id"],
                    status="completed",
                    total_count=10,
                    correct_count=10,
                    xp_earned=100,
                    session_number=number,
                ))
            db.commit()
        finally:
            db.close()

        response = client.get(f"/users/{user_id}/dashboard")
        assert response.status_code == 200, response.text
        dashboard = response.json()
        german_progress = next(
            item for item in dashboard["exercise_language_progress"]
            if item["language_code"] == "de"
        )

        assert german_progress["completed_exercises"] == 250
        expected_percent = round(250 / ExerciseService.target_items_for_language("de") * 100, 2)
        assert german_progress["total_exercises"] == ExerciseService.target_items_for_language("de")
        assert german_progress["progress_percent"] == expected_percent
        assert dashboard["active_language_progress"]["language_code"] == "de"
        assert dashboard["active_language_progress"]["progress_percent"] == expected_percent
        assert round(dashboard["active_wave"]["hours_input"], 2) == round(250 / 60, 2)

def test_dashboard_active_language_follows_latest_exercise_activity():
    user_id = 94008
    with TestClient(app) as client:
        client.post(f"/users/{user_id}/bootstrap")
        lessons = client.get("/exercise-lessons", params={"user_id": user_id}).json()
        german = next(lesson for lesson in lessons if lesson["language_code"] == "de")
        french = next(lesson for lesson in lessons if lesson["language_code"] == "fr")

        db = SessionLocal()
        try:
            db.query(ExerciseSession).filter(ExerciseSession.user_id == user_id).delete()
            db.commit()
            db.add(ExerciseSession(
                user_id=user_id,
                lesson_id=german["id"],
                status="completed",
                total_count=20,
                correct_count=20,
                xp_earned=200,
                session_number=1,
                started_at=datetime.utcnow() - timedelta(hours=2),
                completed_at=datetime.utcnow() - timedelta(hours=1),
            ))
            db.add(ExerciseSession(
                user_id=user_id,
                lesson_id=french["id"],
                status="in_progress",
                total_count=10,
                correct_count=8,
                xp_earned=80,
                session_number=1,
                started_at=datetime.utcnow(),
            ))
            db.commit()
        finally:
            db.close()

        dashboard = client.get(f"/users/{user_id}/dashboard").json()

        assert dashboard["active_language_progress"]["language_code"] == "fr"
        assert dashboard["active_wave"]["language"] == "fr"
        assert dashboard["active_wave"]["language_name"] == french["language_name"]
        assert dashboard["active_wave"]["hours_input"] == 0
        assert {item["language_code"] for item in dashboard["exercise_language_progress"]} >= {"de", "fr"}

def test_recent_activity_uses_learning_path_session_number_not_database_id():
    user_id = 94003
    with TestClient(app) as client:
        client.post(f"/users/{user_id}/bootstrap")
        lesson = next(lesson for lesson in client.get("/exercise-lessons", params={"user_id": user_id}).json() if lesson["language_code"] == "de")
        session = client.post(
            f"/exercise-lessons/{lesson['id']}/sessions",
            params={"user_id": user_id, "session_number": 17},
        ).json()
        db_id = session["id"]

        complete = client.post(f"/exercise-sessions/{db_id}/complete")
        assert complete.status_code == 200, complete.text
        dashboard = client.get(f"/users/{user_id}/dashboard").json()
        recent_note = dashboard["recent_logs"][0]["notes"]

        assert "sessão 17" in recent_note
        assert f"sessão {db_id}" not in recent_note

def test_words_endpoint_lists_learned_correct_answers_by_language():
    user_id = 94004
    with TestClient(app) as client:
        client.post(f"/users/{user_id}/bootstrap")
        lesson = next(lesson for lesson in client.get("/exercise-lessons", params={"user_id": user_id}).json() if lesson["language_code"] == "de")
        session = client.post(f"/exercise-lessons/{lesson['id']}/sessions", params={"user_id": user_id}).json()
        item = session["current_item"]
        answer = client.post(f"/exercise-sessions/{session['id']}/answer", json={"item_id": item["id"], "payload": item["answer"]})
        assert answer.status_code == 200, answer.text
        client.post(f"/exercise-sessions/{session['id']}/complete")

        response = client.get(f"/users/{user_id}/words")
        assert response.status_code == 200, response.text
        payload = response.json()

        assert payload["total"] >= 1
        assert payload["languages"][0]["language_code"] == "de"
        first = payload["languages"][0]["words"][0]
        assert first["language_code"] == "de"
        assert first["language_name"] == "Alemão"
        assert first["word"]
        assert first["translation_pt"]
        assert first["source"] == "exercise_answer"

def test_words_endpoint_ignores_inactive_mislabeled_lessons():
    user_id = 94005
    with TestClient(app) as client:
        client.post(f"/users/{user_id}/bootstrap")
        db = SessionLocal()
        try:
            stale = ExerciseLesson(
                language_code="fr",
                language_name="Francês",
                slug="stale-german-content",
                title="Stale German content mislabeled as French",
                description="legacy bad seed",
                order_index=999,
                active=False,
            )
            db.add(stale)
            db.commit()
            db.refresh(stale)
            item = ExerciseItem(
                lesson_id=stale.id,
                order_index=1,
                type="choice",
                prompt="Como dizer olá?",
                answer={"value": "Hallo"},
                options=[{"value": "Hallo", "label_pt": "Olá"}],
                xp_reward=10,
            )
            db.add(item)
            db.commit()
            db.refresh(item)
            db.add(ExerciseSession(
                user_id=user_id,
                lesson_id=stale.id,
                status="completed",
                total_count=1,
                correct_count=1,
                session_number=1,
            ))
            db.commit()
        finally:
            db.close()

        payload = client.get(f"/users/{user_id}/words").json()
        assert all(lang["language_code"] != "fr" for lang in payload["languages"])
        assert all(word["word"] != "Hallo" for word in payload["words"])


def test_words_endpoint_splits_sequence_dialogue_into_short_phrase_translations():
    user_id = 94006
    with TestClient(app) as client:
        client.post(f"/users/{user_id}/bootstrap")
        lesson = next(lesson for lesson in client.get("/exercise-lessons", params={"user_id": user_id}).json() if lesson["language_code"] == "de")
        db = SessionLocal()
        try:
            item = db.query(ExerciseItem).filter(
                ExerciseItem.lesson_id == lesson["id"],
                ExerciseItem.type == "sequence_dialogue",
            ).first()
            assert item is not None
            session = ExerciseSession(
                user_id=user_id,
                lesson_id=lesson["id"],
                status="completed",
                total_count=20,
                correct_count=20,
                session_number=1,
            )
            db.add(session)
            db.commit()
        finally:
            db.close()

        payload = client.get(f"/users/{user_id}/words").json()
        rows = {word["word"]: word["translation_pt"] for word in payload["words"]}

        assert rows.get("Ja, das stimmt.") == "Sim, está certo."
        assert rows.get("Auf Wiedersehen.") == "Até logo."
        assert all("Unidade " not in translation for translation in rows.values())
        assert all("organize os cartões" not in translation for translation in rows.values())

def test_words_endpoint_normalizes_reversed_match_pairs_to_target_language_first():
    user_id = 94007
    with TestClient(app) as client:
        client.post(f"/users/{user_id}/bootstrap")
        db = SessionLocal()
        try:
            lesson = ExerciseLesson(
                language_code="de",
                language_name="Alemão",
                slug="pair-direction-test",
                title="Pair direction test",
                description="test",
                order_index=2001,
                active=True,
            )
            db.add(lesson)
            db.commit()
            db.refresh(lesson)
            item = ExerciseItem(
                lesson_id=lesson.id,
                order_index=1,
                type="match",
                prompt="Combine.",
                answer={"pairs": [["Eu quero o prato principal.", "Ich nehme das Hähnchen."]]},
                pairs=[["Eu quero o prato principal.", "Ich nehme das Hähnchen."]],
                xp_reward=10,
            )
            db.add(item)
            db.commit()
            db.refresh(item)
            db.add(ExerciseSession(
                user_id=user_id,
                lesson_id=lesson.id,
                status="completed",
                total_count=1,
                correct_count=1,
                session_number=1,
            ))
            db.commit()
        finally:
            db.close()

        payload = client.get(f"/users/{user_id}/words").json()
        rows = {word["word"]: word["translation_pt"] for word in payload["words"]}

        assert rows.get("Ich nehme das Hähnchen.") == "Eu quero o prato principal."
        assert "Eu quero o prato principal." not in rows

