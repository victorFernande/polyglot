#!/usr/bin/env python3
"""POLYGLOT exercise idea generator.

Produces topic-aligned exercise blueprints without modifying production data.
Use as input for POLYGLOT-QA or a developer implementing new question types.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "docker" / "backend"
BACKEND_PYTHON = BACKEND / ".venv" / "bin" / "python"
if BACKEND_PYTHON.exists() and Path(sys.prefix).resolve() != (BACKEND / ".venv").resolve():
    import os

    os.execv(str(BACKEND_PYTHON), [str(BACKEND_PYTHON), *sys.argv])
sys.path.insert(0, str(BACKEND))

from curriculum import A1_UNITS  # noqa: E402
from services import ExerciseService  # noqa: E402

IDEA_TYPES = [
    "sentence_reorder_drag",
    "audio_minimal_pair_choice",
    "image_to_phrase_no_pt_options",
    "microdialogue_completion",
    "error_correction",
    "cloze_context",
    "matching_phrase_to_meaning",
    "listen_then_build",
    "spaced_review_variant",
    "culture_micro_context",
]


def phrase_for(language: str, unit_number: int, topic_number: int):
    unit = A1_UNITS[unit_number - 1]
    pt, target = unit["phrases"][language][topic_number - 1]
    return unit, unit["topics"][topic_number - 1], pt, target


def idea(language: str, unit_number: int, topic_number: int, idea_type: str, index: int) -> dict:
    unit, topic, pt, target = phrase_for(language, unit_number, topic_number)
    lang_name = ExerciseService.LANGUAGE_NAMES[language]
    base = {
        "language": language,
        "language_name": lang_name,
        "unit_number": unit_number,
        "unit_title": unit["title"],
        "topic_number": topic_number,
        "topic": topic,
        "source_phrase_pt": pt,
        "target_phrase": target,
        "idea_type": idea_type,
        "qa_agent": "polyglot",
    }
    if idea_type == "sentence_reorder_drag":
        base.update({
            "prompt": f"Monte a frase em {lang_name} para dizer: {pt}",
            "payload_shape": {"type": "build", "answer": target.split() if language != "jp" else list(target)},
            "quality_notes": "Preferir chips arrastáveis; evitar tarefa de uma carta só.",
        })
    elif idea_type == "audio_minimal_pair_choice":
        base.update({
            "prompt": f"Ouça e escolha a frase em {lang_name} que você ouviu.",
            "payload_shape": {"type": "listen_choice", "audio_text": target, "answer": target},
            "quality_notes": "Distratores devem ser parecidos, mas claramente incorretos; não mostrar tradução antes da resposta.",
        })
    elif idea_type == "image_to_phrase_no_pt_options":
        base.update({
            "prompt": f"Observe a imagem e escolha a frase em {lang_name} correta.",
            "payload_shape": {"type": "image_choice", "answer": target},
            "quality_notes": "Opções visíveis sem português; imagem sem vazar a resposta textual.",
        })
    elif idea_type == "microdialogue_completion":
        base.update({
            "prompt": f"Complete o microdiálogo no tema “{topic}”.",
            "payload_shape": {"type": "context_choice", "answer": target},
            "quality_notes": "A fala anterior deve ser natural e do mesmo cenário; sem frases metalinguísticas como 'I read X'.",
        })
    elif idea_type == "error_correction":
        base.update({
            "prompt": f"Escolha a forma correta em {lang_name} para comunicar: {pt}",
            "payload_shape": {"type": "choice", "answer": target},
            "quality_notes": "Distratores podem conter erros realistas de ordem, flexão ou palavra, mas nunca ensinar forma falsa como correta.",
        })
    elif idea_type == "cloze_context":
        base.update({
            "prompt": f"Complete a lacuna da frase em {lang_name} no contexto “{topic}”.",
            "payload_shape": {"type": "fill_blank", "answer": target},
            "quality_notes": "A lacuna deve testar uma palavra/construção já ensinada; aceitar variantes só se o produto conseguir pontuar.",
        })
    elif idea_type == "matching_phrase_to_meaning":
        base.update({
            "prompt": f"Relacione cada frase em {lang_name} ao significado em português no tema “{topic}”.",
            "payload_shape": {"type": "match", "pairs": "4 phrase↔meaning pairs"},
            "quality_notes": "Não usar enunciado genérico; lados sem duplicatas.",
        })
    elif idea_type == "listen_then_build":
        base.update({
            "prompt": f"Ouça e monte a frase em {lang_name}.",
            "payload_shape": {"type": "listen_build", "audio_text": target, "answer": target.split() if language != "jp" else list(target)},
            "quality_notes": "Garantir audio_text/audio_lang e tokens suficientes.",
        })
    elif idea_type == "spaced_review_variant":
        base.update({
            "prompt": f"Revisão espaçada: escolha como dizer “{pt}” em {lang_name}.",
            "payload_shape": {"type": "choice", "answer": target},
            "quality_notes": "Misturar vocabulário anterior sem sair do nível A1.",
        })
    else:
        base.update({
            "prompt": f"Em uma situação cultural cotidiana, use a frase em {lang_name} para: {pt}",
            "payload_shape": {"type": "context_choice", "answer": target},
            "quality_notes": "Contexto cultural leve, sem estereótipos e sem conhecimento externo obrigatório.",
        })
    base["acceptance_checklist"] = [
        "prompt claro e compatível com o tipo",
        "sem vazamento da resposta",
        "resposta correta aparece/é pontuável",
        "distratores plausíveis e não ambíguos",
        "alinhado ao tópico e à unidade",
        "feedback explica a resposta sem entregar antes da tentativa",
    ]
    base["idea_id"] = f"{language}-u{unit_number:02d}-t{topic_number:02d}-{index:02d}-{idea_type}"
    return base


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--language", default="de", choices=list(ExerciseService.LANGUAGE_NAMES.keys()))
    parser.add_argument("--unit", type=int, default=2)
    parser.add_argument("--topic", type=int, default=5)
    parser.add_argument("--count", type=int, default=6)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    items = [idea(args.language, args.unit, args.topic, IDEA_TYPES[i % len(IDEA_TYPES)], i + 1) for i in range(args.count)]
    if args.json:
        print(json.dumps(items, ensure_ascii=False, indent=2))
    else:
        print("## POLYGLOT new exercise ideas")
        for item in items:
            print(f"- **{item['idea_id']}** `{item['idea_type']}`")
            print(f"  - Prompt: {item['prompt']}")
            print(f"  - Answer: {item['target_phrase']}")
            print(f"  - QA: {item['quality_notes']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
