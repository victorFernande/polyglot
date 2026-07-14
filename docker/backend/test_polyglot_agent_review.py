import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "shared/tools"))

import polyglot_agent_review  # noqa: E402
from polyglot_agent_review import context_for_index, review_item, add_repetition_verdicts  # noqa: E402


def test_model_review_calls_live_9router_proxy_default_endpoint_and_model(monkeypatch):
    captured = {}

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["body"] = request.data.decode("utf-8")

        class Response:
            def read(self):
                return b'{"choices":[{"message":{"content":"PASS"}}]}'

        return Response()

    monkeypatch.delenv("POLYGLOT_9ROUTER_BASE_URL", raising=False)
    monkeypatch.setattr(polyglot_agent_review.urllib.request, "urlopen", fake_urlopen)

    result = polyglot_agent_review.call_9router_review("cx/gpt-5.5", [], {}, {})

    assert result["status"] == "ok"
    assert captured["url"] == "http://127.0.0.1:11434/v1/chat/completions"
    assert '"model": "cx/gpt-5.5"' in captured["body"]
    assert '"max_tokens": 2500' in captured["body"]


def test_model_review_allows_endpoint_override(monkeypatch):
    captured = {}

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url

        class Response:
            def read(self):
                return b'{"choices":[{"message":{"content":"PASS"}}]}'

        return Response()

    monkeypatch.setenv("POLYGLOT_9ROUTER_BASE_URL", "http://127.0.0.1:9999/v1")
    monkeypatch.setattr(polyglot_agent_review.urllib.request, "urlopen", fake_urlopen)

    result = polyglot_agent_review.call_9router_review("cx/gpt-5.5", [], {}, {})

    assert result["status"] == "ok"
    assert captured["url"] == "http://127.0.0.1:9999/v1/chat/completions"


def test_polyglot_qa_blocks_sequence_dialogue_without_explicit_order():
    item = {
        "type": "sequence_dialogue",
        "prompt": "Unidade 1/10 — Café · Tópico 1/10 — pedir: monte uma sequência curta; ordene as frases pelo fluxo lógico da situação",
        "answer": {"value": ["Hallo", "Ich möchte Kaffee.", "Danke.", "Auf Wiedersehen."]},
        "options": None,
        "tiles": ["Danke.", "Hallo", "Auf Wiedersehen.", "Ich möchte Kaffee."],
        "pairs": None,
    }

    result = review_item("de", 8, item)

    assert result["verdict"] == "BLOCK"
    assert any(issue["code"] == "sequence_missing_explicit_order" for issue in result["issues"])


def test_polyglot_qa_revises_generic_book_icon_for_non_book_image_choice():
    item = {
        "type": "image_choice",
        "prompt": "Observe a imagem e escolha a frase que representa “obrigado”",
        "answer": {"value": "Danke."},
        "options": [
            {"label_pt": "obrigado", "value": "Danke.", "icon_key": "book", "svg": "<svg viewBox='0 0 1 1'></svg>"},
            {"label_pt": "água", "value": "Wasser", "icon_key": "water", "svg": "<svg viewBox='0 0 1 1'></svg>"},
        ],
        "tiles": None,
        "pairs": None,
    }

    result = review_item("de", 2, item)

    assert result["verdict"] == "REVISE"
    assert any(issue["code"] == "generic_book_icon" for issue in result["issues"])


def test_polyglot_qa_blocks_visible_answer_leak():
    item = {
        "type": "choice",
        "prompt": "entenda “The menu, please.” — qual é o significado em português?",
        "answer": {"value": "menu"},
        "options": ["menu", "conta", "mesa", "bebida"],
        "tiles": None,
        "pairs": None,
    }

    result = review_item("en", 315, item)

    assert result["verdict"] == "BLOCK"
    assert any(issue["code"] == "visible_answer_leak" for issue in result["issues"])


def test_polyglot_qa_blocks_topic_label_prompt_with_full_sentence_answer():
    item = {
        "type": "choice",
        "prompt": "Unidade 10/10 — Exponha preferências · Tópico 8/10 — cidade: escolha como dizer “cidade” em Alemão",
        "answer": {"value": "Ich mag diese Stadt."},
        "options": ["Ich mag diese Stadt.", "Ich mag Fußball.", "Ich bevorzuge Tee.", "Ich mag Kaffee."],
        "tiles": None,
        "pairs": None,
    }

    result = review_item("de", 972, item)

    assert result["verdict"] == "BLOCK"
    assert any(issue["code"] == "topic_label_sentence_mismatch" for issue in result["issues"])


def test_polyglot_qa_context_handles_incremental_items_after_base_track():
    context = context_for_index(1009)

    assert context["unit_number"] == 10
    assert context["unit_title"] == "Exponha preferências"
    assert context["session_number"] == 51
    assert context["question_in_session"] == 10


def test_polyglot_qa_context_numbers_twenty_question_sessions_without_wrapping_at_ten():
    first_half = context_for_index(1220)
    second_half = context_for_index(1230)

    assert first_half["session_number"] == 62
    assert first_half["question_in_session"] == 1
    assert second_half["session_number"] == 62
    assert second_half["question_in_session"] == 11


def test_polyglot_qa_blocks_match_translation_pairs_that_are_only_topic_labels():
    item = {
        "type": "listen_match",
        "prompt": "Revisão guiada: ouça cada áudio em Alemão e selecione a tradução em português",
        "answer": {"pairs": [["Ich mag diese Stadt.", "cidade"], ["Ich mag warmes Wetter.", "clima"], ["Ich finde das gut.", "opinião"], ["Ich mag Fußball.", "esporte"]]},
        "options": None,
        "tiles": None,
        "pairs": [["Ich mag diese Stadt.", "cidade"], ["Ich mag warmes Wetter.", "clima"], ["Ich finde das gut.", "opinião"], ["Ich mag Fußball.", "esporte"]],
    }

    result = review_item("de", 995, item)

    assert result["verdict"] == "BLOCK"
    assert any(issue["code"] == "match_translation_is_topic_label" for issue in result["issues"])


def test_polyglot_qa_blocks_sessions_with_more_than_six_repeated_same_phrase():
    rows = []
    for idx in range(7):
        rows.append(review_item("de", idx, {
            "type": "choice",
            "prompt": "Unidade 1/10 — Café · Tópico 1/10 — cumprimentar: escolha como dizer “Olá.” em Alemão",
            "answer": {"value": "Hallo."},
            "options": ["Hallo.", "Danke.", "Bitte.", "Tschüss."],
            "tiles": None,
            "pairs": None,
        }))

    add_repetition_verdicts(rows)

    assert {row["verdict"] for row in rows} == {"BLOCK"}
    assert all(any(issue["code"] == "same_phrase_repeated_more_than_five_in_session" for issue in row["issues"]) for row in rows)


def test_polyglot_qa_blocks_out_of_context_phrase_inside_current_session_topic():
    item = {
        "type": "listen_match",
        "prompt": "Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: ouça cada áudio em Alemão e selecione a tradução em português",
        "answer": {"pairs": [["Ich möchte einen Kaffee.", "Eu gostaria de um café."], ["Das ist mein Gepäck.", "Esta é minha bagagem."], ["Ein Wasser, bitte.", "Uma água, por favor."], ["Danke.", "Obrigado."]]},
        "options": None,
        "tiles": None,
        "pairs": [["Ich möchte einen Kaffee.", "Eu gostaria de um café."], ["Das ist mein Gepäck.", "Esta é minha bagagem."], ["Ein Wasser, bitte.", "Uma água, por favor."], ["Danke.", "Obrigado."]],
    }

    result = review_item("de", 2, item)

    assert result["verdict"] == "BLOCK"
    assert any(issue["code"] == "session_topic_semantic_drift" for issue in result["issues"])
    assert any("bagagem" in issue["message"] or "Gepäck" in issue["message"] for issue in result["issues"])


def test_polyglot_qa_allows_current_unit_phrases_inside_current_session_topic():
    item = {
        "type": "listen_match",
        "prompt": "Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: ouça cada áudio em Alemão e selecione a tradução em português",
        "answer": {"pairs": [["Ich möchte einen Kaffee.", "Eu gostaria de um café."], ["Ein Wasser, bitte.", "Uma água, por favor."], ["Ich möchte ein Brot.", "Eu gostaria de um pão."], ["Danke.", "Obrigado."]]},
        "options": None,
        "tiles": None,
        "pairs": [["Ich möchte einen Kaffee.", "Eu gostaria de um café."], ["Ein Wasser, bitte.", "Uma água, por favor."], ["Ich möchte ein Brot.", "Eu gostaria de um pão."], ["Danke.", "Obrigado."]],
    }

    result = review_item("de", 2, item)

    assert not any(issue["code"] == "session_topic_semantic_drift" for issue in result["issues"])


def test_polyglot_qa_allows_incremental_review_items_when_prompt_declares_the_source_unit():
    item = {
        "type": "listen_match",
        "prompt": "Sessão 62 — Revisão incremental · Viagem em contexto: ouça cada áudio em Alemão e selecione a tradução em português",
        "answer": {"pairs": [["Ich brauche ein Ticket.", "Eu preciso de uma passagem."], ["Wo ist der Bahnhof?", "Onde fica a estação?"], ["Ich brauche Hilfe.", "Eu preciso de ajuda."], ["Ich komme heute an.", "Eu chego hoje."]]},
        "options": None,
        "tiles": None,
        "pairs": [["Ich brauche ein Ticket.", "Eu preciso de uma passagem."], ["Wo ist der Bahnhof?", "Onde fica a estação?"], ["Ich brauche Hilfe.", "Eu preciso de ajuda."], ["Ich komme heute an.", "Eu chego hoje."]],
    }

    result = review_item("de", 1225, item)

    assert not any(issue["code"] == "session_topic_semantic_drift" for issue in result["issues"])
