import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "shared/tools"))

from polyglot_agent_review import review_item  # noqa: E402


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
