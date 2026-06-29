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
            assert {item.type for item in items} >= {"choice", "build", "match", "image_choice"}
            assert all(item.hint for item in items)
            assert all(item.explanation for item in items)
            assert any("Unidade 1/10 — Fazendo um pedido no café" in item.prompt for item in items)
            assert any("Unidade 2/10 — Apresente-se" in item.prompt for item in items)
            assert any("Unidade 10/10 — Exponha preferências" in item.prompt for item in items)
            assert any("Mini-aula" in item.hint for item in items)
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
            "de-trilha-a1-situacional-1000",
            "fr-trilha-a1-situacional-1000",
            "ru-trilha-a1-situacional-1000",
            "jp-trilha-a1-situacional-1000",
            "en-trilha-a1-situacional-1000",
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


def test_image_choice_payload_accepts_selected_foreign_value():
    item = next(item for item in ExerciseService.generate_items("de") if item["type"] == "image_choice")
    selected_value = item["options"][0]["value"]

    assert ExerciseService.normalize(selected_value) == ExerciseService.normalize({"value": selected_value})


def test_image_choice_uses_semantic_svg_icon_bank():
    image_items = [item for item in ExerciseService.generate_items("de") if item["type"] == "image_choice"]
    icon_keys = {option["icon_key"] for item in image_items for option in item["options"]}

    assert {"book", "coffee", "water", "train", "person", "phone", "fork"}.issubset(icon_keys)
    assert len(icon_keys) >= 10
    assert "ambulance" not in icon_keys


def test_first_cafe_image_choice_uses_topic_phrase_not_unrelated_visual_vocabulary():
    items = ExerciseService.generate_items("de")
    item = next(item for item in items if item["type"] == "image_choice")

    assert "Krankenwagen" not in item["prompt"]
    assert "ambulance" not in {option["icon_key"] for option in item["options"]}
    assert "Tópico 1/10 — cumprimentar" in item["prompt"]
    assert item["answer"]["value"] in [option["value"] for option in item["options"]]
    assert all(option["display_text"] == option["value"] for option in item["options"])
    correct = next(option for option in item["options"] if option["value"] == item["answer"]["value"])
    assert correct["label_pt"] in item["prompt"]
    assert correct["icon_key"] != "ambulance"


def test_image_choice_options_include_frontend_ready_image_src():
    item = next(item for item in ExerciseService.generate_items("de") if item["type"] == "image_choice")

    assert all(option["image_src"].startswith("data:image/svg+xml;charset=UTF-8,") for option in item["options"])
    assert all("%3Csvg" in option["image_src"] for option in item["options"])


def test_first_five_exercises_are_not_repetitive_variations_of_same_task():
    first_five = ExerciseService.generate_items("de")[:5]
    types = [item["type"] for item in first_five]
    prompts = [item["prompt"] for item in first_five]

    assert types == ["choice", "listen_choice", "image_choice", "build", "context_choice"]
    assert any("ouça" in prompt.casefold() for prompt in prompts)
    assert any("imagem" in prompt.casefold() for prompt in prompts)
    assert any("complete" in prompt.casefold() or "situação" in prompt.casefold() for prompt in prompts)


def test_flashcards_that_ask_to_listen_include_audio_payload():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ExerciseService.seed_lessons(db)
        cards = ExerciseService.flashcards(db, language="de", limit=20)
        listen_cards = [card for card in cards if "ouça" in f"{card['front']} {card['hint']}".casefold()]

        assert listen_cards, "fixture should include at least one listen-style flashcard"
        assert all(card.get("audio_text") for card in listen_cards)
        assert all(card.get("audio_lang") == "de-DE" for card in listen_cards)
    finally:
        db.close()



def _answer_signature(item):
    answer = item["answer"].get("value") or item["answer"].get("pairs")
    if isinstance(answer, list):
        return repr(answer)
    return str(answer).casefold()


def test_first_sixty_have_substantially_more_unique_answers_than_old_cafe_loop():
    items = ExerciseService.generate_items("de")[:60]
    unique_answers = {_answer_signature(item) for item in items}

    assert len(unique_answers) >= 42, sorted(unique_answers)
    assert sum(1 for item in items if _answer_signature(item) == "hallo") <= 2
    assert sum(1 for item in items if "kaffee" in _answer_signature(item)) <= 4


def test_full_german_track_has_broad_answer_bank_not_ten_phrases_per_unit():
    items = ExerciseService.generate_items("de")
    unique_answers = {_answer_signature(item) for item in items}

    assert len(items) == 1000
    assert len(unique_answers) >= 220
