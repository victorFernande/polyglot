import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.NamedTemporaryFile(delete=False).name}"

from models import Base, engine, SessionLocal, ExerciseLesson, ExerciseItem  # noqa: E402
from services import ExerciseService  # noqa: E402
from curriculum import A1_UNITS  # noqa: E402


LANGUAGES = {"de", "fr", "ru", "jp", "en"}


METALINGUISTIC_MARKERS = {
    "de": ["das Wort "],
    "fr": ["le mot "],
    "ru": ["слово "],
    "jp": ["という言葉"],
    "en": ["the word "],
}


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
        db.refresh(legacy)
        assert legacy.active is False
    finally:
        db.close()


def test_incremental_cron_target_closes_active_german_session_54_with_twenty_contact_items():
    assert ExerciseService.SESSION_SIZE == 20
    assert ExerciseService.TARGET_ITEMS == 1000
    assert ExerciseService.target_items_for_language("de") == 1090
    assert {language: ExerciseService.target_items_for_language(language) for language in LANGUAGES - {"de"}} == {
        "fr": 1000,
        "ru": 1000,
        "jp": 1000,
        "en": 1000,
    }

    german_items = ExerciseService.generate_items("de")
    last_block_size = len(german_items) % ExerciseService.SESSION_SIZE
    session_54 = german_items[1060:1080]
    session_54_second_half = german_items[1070:1080]

    assert len(german_items) >= 1080
    assert len(german_items[:1080]) % ExerciseService.SESSION_SIZE == 0
    assert len(session_54) == ExerciseService.SESSION_SIZE
    assert len(session_54_second_half) == 10
    assert [item["type"] for item in session_54_second_half] == [
        "choice",
        "listen_choice",
        "image_choice",
        "build",
        "context_choice",
        "listen_match",
        "choice",
        "listen_build",
        "sequence_dialogue",
        "context_choice",
    ]
    assert all("Sessão 54" in item["prompt"] for item in session_54)
    assert any("Mein Nachname ist Fernandes." in repr(item) for item in session_54_second_half)
    assert any("Die Nummer ist vier fünf sechs." in repr(item) for item in session_54_second_half)
    assert any("Ich schreibe eine Nachricht." in repr(item) for item in session_54_second_half)
    assert all("a palavra" not in item["prompt"].casefold() for item in session_54)
    assert all("das Wort" not in repr(item) for item in session_54)
    sequence = session_54_second_half[-2]
    assert sequence["type"] == "sequence_dialogue"
    assert sequence["options"] is None
    assert sequence["pairs"] is None
    assert "português" not in "\n".join(sequence["tiles"]).casefold()
    assert sequence["answer"]["value"] == [
        "Die Nummer ist vier fünf sechs.",
        "Ich buchstabiere meinen Namen.",
        "Ich schreibe eine Nachricht.",
        "Hier ist mein Kontakt.",
    ]


def test_incremental_cron_target_opens_active_german_session_55_with_ten_family_items():
    assert ExerciseService.SESSION_SIZE == 20
    assert ExerciseService.TARGET_ITEMS == 1000
    assert ExerciseService.target_items_for_language("de") == 1090
    assert {language: ExerciseService.target_items_for_language(language) for language in LANGUAGES - {"de"}} == {
        "fr": 1000,
        "ru": 1000,
        "jp": 1000,
        "en": 1000,
    }

    german_items = ExerciseService.generate_items("de")
    last_block_size = len(german_items) % ExerciseService.SESSION_SIZE
    session_55_first_half = german_items[1080:1090]

    assert len(german_items) == 1090
    assert last_block_size == 10
    assert len(session_55_first_half) == 10
    assert [item["type"] for item in session_55_first_half] == [
        "choice",
        "listen_choice",
        "image_choice",
        "build",
        "context_choice",
        "listen_match",
        "choice",
        "listen_build",
        "sequence_dialogue",
        "context_choice",
    ]
    assert all("Sessão 55" in item["prompt"] for item in session_55_first_half)
    assert any("Das ist meine Mutter." in repr(item) for item in session_55_first_half)
    assert any("Ich habe einen Bruder." in repr(item) for item in session_55_first_half)
    assert any("Meine Familie ist groß." in repr(item) for item in session_55_first_half)
    assert all("a palavra" not in item["prompt"].casefold() for item in session_55_first_half)
    assert all("das Wort" not in repr(item) for item in session_55_first_half)
    sequence = session_55_first_half[-2]
    assert sequence["type"] == "sequence_dialogue"
    assert sequence["options"] is None
    assert sequence["pairs"] is None
    assert "português" not in "\n".join(sequence["tiles"]).casefold()
    assert sequence["answer"]["value"] == [
        "Das ist meine Mutter.",
        "Das ist mein Vater.",
        "Ich habe einen Bruder.",
        "Ich habe eine Schwester.",
    ]


def test_previous_incremental_german_session_54_first_half_remains_unchanged():
    german_items = ExerciseService.generate_items("de")
    session_54_first_half = german_items[1060:1070]

    assert len(session_54_first_half) == 10
    assert [item["type"] for item in session_54_first_half] == [
        "choice",
        "listen_choice",
        "image_choice",
        "build",
        "context_choice",
        "listen_match",
        "choice",
        "listen_build",
        "sequence_dialogue",
        "context_choice",
    ]
    assert any("Meine Telefonnummer ist eins zwei drei." in repr(item) for item in session_54_first_half)
    assert any("Meine E-Mail ist hier." in repr(item) for item in session_54_first_half)
    assert any("Können Sie das wiederholen?" in repr(item) for item in session_54_first_half)
    sequence = session_54_first_half[-2]
    assert sequence["answer"]["value"] == [
        "Meine Telefonnummer ist eins zwei drei.",
        "Meine E-Mail ist hier.",
        "Das ist meine Adresse.",
        "Mein Name ist Victor.",
    ]


def test_previous_incremental_german_session_53_remains_closed_at_twenty_restaurant_items():
    german_items = ExerciseService.generate_items("de")
    last_block_size = len(german_items[:1060]) % ExerciseService.SESSION_SIZE
    session_53 = german_items[1040:1060]

    assert len(german_items) >= 1060
    assert last_block_size == 0
    assert len(session_53) == ExerciseService.SESSION_SIZE
    assert [item["type"] for item in session_53[-10:]] == [
        "choice",
        "listen_choice",
        "image_choice",
        "build",
        "context_choice",
        "listen_match",
        "choice",
        "listen_build",
        "sequence_dialogue",
        "context_choice",
    ]
    assert all("Sessão 53" in item["prompt"] for item in session_53)
    assert any("Ich habe einen Tisch." in repr(item) for item in session_53)
    assert any("Die Speisekarte, bitte." in repr(item) for item in session_53)
    assert any("Die Rechnung, bitte." in repr(item) for item in session_53)
    assert all("a palavra" not in item["prompt"].casefold() for item in session_53)
    assert all("das Wort" not in repr(item) for item in session_53)
    sequence = session_53[-2]
    assert sequence["type"] == "sequence_dialogue"
    assert sequence["options"] is None
    assert sequence["pairs"] is None
    assert "português" not in "\n".join(sequence["tiles"]).casefold()
    assert sequence["answer"]["value"] == [
        "Ich möchte Wasser.",
        "Ohne Fleisch, bitte.",
        "Was empfehlen Sie?",
        "Die Rechnung, bitte.",
    ]


def test_previous_incremental_german_session_53_first_half_remains_unchanged():
    german_items = ExerciseService.generate_items("de")
    session_53_first_half = german_items[1040:1050]

    assert len(session_53_first_half) == 10
    assert all("Sessão 53" in item["prompt"] for item in session_53_first_half)
    assert [item["type"] for item in session_53_first_half] == [
        "choice",
        "listen_choice",
        "image_choice",
        "build",
        "context_choice",
        "listen_match",
        "choice",
        "listen_build",
        "sequence_dialogue",
        "context_choice",
    ]
    sequence = session_53_first_half[-2]
    assert sequence["answer"]["value"] == [
        "Ich habe einen Tisch.",
        "Die Speisekarte, bitte.",
        "Ich nehme eine Suppe.",
        "Ich nehme das Hähnchen.",
    ]


def test_previous_incremental_german_session_52_remains_closed_at_twenty_items():
    german_items = ExerciseService.generate_items("de")
    session_52 = german_items[1020:1040]

    assert len(session_52) == ExerciseService.SESSION_SIZE
    assert all("Sessão 52" in item["prompt"] for item in session_52)
    assert all("Eu viajo para a cidade" not in item["prompt"] for item in session_52)
    assert any("Eu viajo para Berlim" in item["prompt"] for item in session_52)
    sequence = session_52[-2]
    assert sequence["answer"]["value"] == [
        "Ich nehme den Zug.",
        "Wann fährt der Bus?",
        "Das ist mein Gepäck.",
        "Ich komme heute an.",
    ]


def test_previous_incremental_german_session_51_remains_closed_at_twenty_items():
    german_items = ExerciseService.generate_items("de")
    session_51 = german_items[1000:1020]

    assert len(session_51) == ExerciseService.SESSION_SIZE
    assert all("Sessão 51" in item["prompt"] for item in session_51)
    assert [item["type"] for item in session_51[-10:]] == [
        "choice",
        "listen_choice",
        "image_choice",
        "build",
        "context_choice",
        "listen_match",
        "choice",
        "listen_build",
        "sequence_dialogue",
        "context_choice",
    ]


def test_previous_incremental_german_session_52_first_half_remains_unchanged():
    german_items = ExerciseService.generate_items("de")
    session_52_first_half = german_items[1020:1030]

    assert len(session_52_first_half) == 10
    assert all("Sessão 52" in item["prompt"] for item in session_52_first_half)
    assert [item["type"] for item in session_52_first_half] == [
        "choice",
        "listen_choice",
        "image_choice",
        "build",
        "context_choice",
        "listen_match",
        "choice",
        "listen_build",
        "sequence_dialogue",
        "context_choice",
    ]
    assert any("Eu viajo para Berlim" in item["prompt"] for item in session_52_first_half)


def test_seed_lessons_appends_incremental_items_without_replacing_existing_ids():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        lesson = ExerciseLesson(
            language_code="de",
            language_name="Alemão",
            slug="de-trilha-a1-situacional-1000",
            title="Trilha A1 Situacional 1000 — Alemão",
            description="fixture with previous hourly state",
            order_index=1,
            active=True,
        )
        db.add(lesson)
        db.flush()
        for idx, item in enumerate(ExerciseService.generate_items("de")[:1020], 1):
            db.add(ExerciseItem(
                lesson_id=lesson.id,
                order_index=idx,
                type=item["type"],
                prompt=item["prompt"],
                answer=item["answer"],
                options=item["options"],
                tiles=item["tiles"],
                pairs=item["pairs"],
                hint=item["hint"],
                explanation=item["explanation"],
                xp_reward=item["xp_reward"],
            ))
        db.commit()
        preserved_ids = [
            item.id
            for item in db.query(ExerciseItem)
            .filter(ExerciseItem.lesson_id == lesson.id)
            .order_by(ExerciseItem.order_index)
            .limit(5)
        ]

        ExerciseService.seed_lessons(db)

        items = db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id).order_by(ExerciseItem.order_index).all()
        assert len(items) == 1090
        assert [item.id for item in items[:5]] == preserved_ids
        assert [item.order_index for item in items[-10:]] == list(range(1081, 1091))
        assert len(items) % ExerciseService.SESSION_SIZE == 10
    finally:
        db.close()


def test_matching_payload_from_frontend_is_accepted_for_german_fundamentals():
    expected_pairs = [["Bitte", "por favor"], ["Ja", "sim"], ["Nein", "não"], ["Wasser", "água"]]
    frontend_payload = {left: right for left, right in expected_pairs}
    canonical_answer = {"pairs": expected_pairs}

    assert ExerciseService.normalize(frontend_payload) == ExerciseService.normalize(canonical_answer)


def test_listen_match_items_pair_target_language_audio_with_portuguese_translations():
    item = next(item for item in ExerciseService.generate_items("de") if item["type"] == "listen_match")

    assert "ouça" in item["prompt"].casefold()
    assert "português" in item["prompt"].casefold()
    assert item["answer"] == {"pairs": item["pairs"]}
    assert len(item["pairs"]) == 4
    assert item["options"] is None
    assert item["tiles"] is None
    assert all(isinstance(left, str) and isinstance(right, str) for left, right in item["pairs"])
    assert any(left != right for left, right in item["pairs"])
    assert ExerciseService.normalize({left: right for left, right in item["pairs"]}) == ExerciseService.normalize(item["answer"])


def test_image_choice_payload_accepts_selected_foreign_value():
    item = next(item for item in ExerciseService.generate_items("de") if item["type"] == "image_choice")
    selected_value = item["options"][0]["value"]

    assert ExerciseService.normalize(selected_value) == ExerciseService.normalize({"value": selected_value})


def test_image_choice_uses_semantic_svg_icon_bank():
    image_items = [item for item in ExerciseService.generate_items("de") if item["type"] == "image_choice"]
    icon_keys = {option["icon_key"] for item in image_items for option in item["options"]}

    assert {"coffee", "water", "train", "person", "phone", "fork", "speech"}.issubset(icon_keys)
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


def test_restaurant_dessert_image_choice_uses_semantic_food_icons_not_generic_book_or_clock():
    item = next(
        item for item in ExerciseService.generate_items("de")
        if item["type"] == "image_choice" and "representa “Eu gostaria de uma sobremesa.”" in item["prompt"]
    )

    icons_by_label = {option["label_pt"]: option["icon_key"] for option in item["options"]}

    assert icons_by_label["Eu gostaria de uma sobremesa."] == "dessert"
    assert "book" not in icons_by_label.values()
    assert "clock" not in icons_by_label.values()


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


def test_listen_build_items_have_audio_build_payload_shape():
    items = ExerciseService.generate_items("de")
    listen_builds = [item for item in items if item["type"] == "listen_build"]

    assert listen_builds, "expected at least one listen_build item in generated track"
    item = listen_builds[0]
    assert "ouça" in f"{item['prompt']} {item['hint']}".casefold()
    assert isinstance(item["answer"]["value"], list)
    assert item["answer"]["value"]
    assert item["tiles"]
    assert item["options"] is None
    assert item["pairs"] is None
    assert all(word in item["tiles"] for word in item["answer"]["value"])


def test_context_choice_uses_guided_situation_instead_of_artificial_microdialogue():
    items = ExerciseService.generate_items("de")
    context_items = [item for item in items if item["type"] == "context_choice"]

    assert context_items, "expected context_choice items in generated track"
    item = context_items[0]
    assert "situação guiada" in item["prompt"].casefold()
    assert "Você:" not in item["prompt"]
    assert "___" not in item["prompt"]
    assert item["answer"]["value"] in item["options"]
    assert len(item["options"]) == 4
    assert all(option in [foreign for _pt, foreign in ExerciseService._expanded_practice_bank("de", A1_UNITS[0], 1)] for option in item["options"])
    assert item["hint"]
    assert item["explanation"]


def test_sequence_dialogue_items_order_four_topic_phrases_and_validate_ordered_payload():
    items = ExerciseService.generate_items("de")
    sequence_items = [item for item in items if item["type"] == "sequence_dialogue"]

    assert sequence_items, "expected at least one sequence_dialogue item in generated track"
    item = sequence_items[0]
    prompt_and_hint = f"{item['prompt']} {item['hint']}".casefold()
    assert "organize" in prompt_and_hint or "monte" in prompt_and_hint
    assert "ordem" in prompt_and_hint
    assert isinstance(item["answer"]["value"], list)
    assert len(item["answer"]["value"]) == 4
    assert len(set(item["answer"]["value"])) == 4
    assert set(item["tiles"]) == set(item["answer"]["value"])
    assert item["tiles"] != item["answer"]["value"]
    assert ExerciseService.normalize(item["answer"]["value"]) == ExerciseService.normalize(item["answer"])
    assert ExerciseService.normalize(list(reversed(item["answer"]["value"]))) != ExerciseService.normalize(item["answer"])


def test_all_sequence_dialogues_state_child_safe_order_context_without_target_answer_leak():
    required_order_markers = [
        "primeiro", "depois", "em seguida", "por fim",
        "saudação", "pedido", "pagamento", "agradecimento", "despedida",
        "nome", "origem", "onde mora", "idioma que fala",
    ]

    for language in LANGUAGES:
        for item in ExerciseService.generate_items(language):
            if item["type"] != "sequence_dialogue":
                continue
            prompt = item["prompt"].casefold()
            assert "fluxo lógico da situação" not in prompt, item["prompt"]
            assert any(marker in prompt for marker in required_order_markers), item["prompt"]
            for target_phrase in item["answer"]["value"]:
                assert target_phrase.casefold() not in prompt, (language, item["prompt"], target_phrase)


def test_image_choice_never_uses_generic_book_icon_for_non_book_concepts():
    allowed_book_labels = {"livro", "estudo"}

    for language in LANGUAGES:
        for item in ExerciseService.generate_items(language):
            if item["type"] != "image_choice":
                continue
            bad_options = [
                (option["label_pt"], option["value"])
                for option in item["options"]
                if option["icon_key"] == "book" and option["label_pt"] not in allowed_book_labels
            ]
            assert not bad_options, (language, item["prompt"], bad_options)


def test_reverse_choice_prompts_do_not_visibly_leak_portuguese_answer_as_cognate():
    for language in LANGUAGES:
        for item in ExerciseService.generate_items(language):
            if item["type"] != "choice" or "significado em português" not in item["prompt"].casefold():
                continue
            answer = item["answer"]["value"].casefold()
            foreign_phrase = item["prompt"].split("entenda “", 1)[1].split("”", 1)[0].casefold()
            assert answer not in foreign_phrase, (language, item["prompt"], item["answer"])


def test_session_15_question_2_uses_profession_content_not_unrelated_number():
    item = ExerciseService.generate_items("de")[141]

    assert item["type"] == "choice"
    assert "dizer profissão" in item["prompt"]
    assert "professor" in item["prompt"].casefold()
    assert item["answer"]["value"] == "Ich bin Lehrer."
    assert "nove" not in item["prompt"].casefold()
    assert "neun" not in repr(item["options"]).casefold()


def test_sequence_dialogue_session_14_question_9_is_a_coherent_introduction():
    items = ExerciseService.generate_items("de")
    item = items[138]

    assert item["type"] == "sequence_dialogue"
    prompt = item["prompt"].casefold()
    assert "monte uma apresentação curta" in prompt
    assert "nome → origem → onde mora → idioma que fala" in prompt
    assert item["answer"]["value"] == [
        "Ich heiße Victor.",
        "Ich komme aus Brasilien.",
        "Ich wohne in São Paulo.",
        "Ich spreche Portugiesisch.",
    ]
    assert item["pairs"] is None
    joined = " ".join(item["answer"]["value"]).casefold()
    assert "das wort" not in joined
    assert "ich höre" not in joined
    assert "ich lese" not in joined
    assert "neun" not in joined


def test_choice_items_include_reverse_comprehension_prompts_with_portuguese_options():
    items = ExerciseService.generate_items("de")
    reverse_items = [
        item for item in items
        if item["type"] == "choice" and "significado em português" in item["prompt"].casefold()
    ]

    assert reverse_items, "expected at least one choice item that asks for target-language comprehension"
    item = reverse_items[0]
    assert "entenda" in item["prompt"].casefold()
    assert item["answer"]["value"] in item["options"]
    assert len(item["options"]) == 4
    unit_portuguese_answers = [pt for pt, _foreign in ExerciseService._expanded_practice_bank("de", A1_UNITS[0], 1)]
    assert all(option in unit_portuguese_answers for option in item["options"])
    assert item["answer"]["value"] != item["prompt"].split("entenda “", 1)[1].split("”", 1)[0]


def test_all_generated_items_have_specific_non_leaking_prompts_after_audit():
    generic_fragments = [
        "combine itens do contexto",
        "responda rápido",
        "conversa real",
        "placa/cardápio",
        "microfrase",
    ]

    for language in LANGUAGES:
        for item in ExerciseService.generate_items(language):
            prompt = item["prompt"]
            prompt_folded = prompt.casefold()
            assert not any(fragment in prompt_folded for fragment in generic_fragments), prompt

            answer = item["answer"].get("value")
            if item["type"] == "choice":
                assert "relacione" not in prompt_folded, prompt
                assert "observe a imagem" not in prompt_folded, prompt
                assert "monte " not in prompt_folded, prompt
            if item["type"] == "listen_choice":
                assert "ouça" in prompt_folded, prompt
                assert "relacione" not in prompt_folded, prompt
            if item["type"] == "image_choice":
                assert isinstance(answer, str)
                assert answer not in prompt, prompt
                assert "(" not in prompt and ")" not in prompt, prompt


def test_complex_exercise_types_do_not_use_metalinguistic_vocabulary_fillers():
    complex_types = {"match", "listen_match", "image_choice", "sequence_dialogue"}

    for language in LANGUAGES:
        markers = METALINGUISTIC_MARKERS[language]
        for item in ExerciseService.generate_items(language):
            if item["type"] not in complex_types:
                continue
            blob = repr(item["answer"]) + repr(item.get("options")) + repr(item.get("pairs")) + repr(item.get("tiles"))
            assert not any(marker in blob for marker in markers), (language, item["type"], item["prompt"], blob)


def test_build_like_items_are_not_single_word_trivial_tasks():
    for language in LANGUAGES:
        for item in ExerciseService.generate_items(language):
            if item["type"] in {"build", "listen_build"}:
                assert len(item["answer"]["value"]) >= 2, (language, item["prompt"], item["answer"])


def test_context_choices_do_not_use_metalinguistic_prompt_openers():
    bad_openers = ["I read ", "Ich lese ", "Je lis ", "J'entends ", "Я читаю ", "Я слышу "]

    for language in LANGUAGES:
        for item in ExerciseService.generate_items(language):
            if item["type"] == "context_choice":
                assert not any(marker in item["prompt"] for marker in bad_openers), (language, item["prompt"])


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

    assert len(unique_answers) >= 24, sorted(unique_answers)
    assert sum(1 for item in items if _answer_signature(item) == "hallo") <= 6
    assert sum(1 for item in items if "kaffee" in _answer_signature(item)) <= 8


def test_full_german_track_has_broad_answer_bank_not_ten_phrases_per_unit():
    items = ExerciseService.generate_items("de")
    unique_answers = {_answer_signature(item) for item in items}

    assert len(items) == ExerciseService.target_items_for_language("de")
    assert len(unique_answers) >= 220
