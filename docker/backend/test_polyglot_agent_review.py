import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "shared/tools"))

import polyglot_agent_review  # noqa: E402
from polyglot_agent_review import context_for_index, review_item  # noqa: E402


def test_model_review_calls_9router_endpoint_and_prefixed_model(monkeypatch):
    captured = {}

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["body"] = request.data.decode("utf-8")

        class Response:
            def read(self):
                return b'{"choices":[{"message":{"content":"PASS"}}]}'

        return Response()

    monkeypatch.setattr(polyglot_agent_review.urllib.request, "urlopen", fake_urlopen)

    result = polyglot_agent_review.call_9router_review("9router/cx/gpt-5.5", [], {}, {})

    assert result["status"] == "ok"
    assert captured["url"] == "http://127.0.0.1:20128/v1/chat/completions"
    assert '"model": "9router/cx/gpt-5.5"' in captured["body"]


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
