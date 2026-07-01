#!/usr/bin/env python3
"""POLYGLOT-QA local review tool.

Reviews generated Polyglot exercise items deterministically using the same
editorial rules as agents/polyglot/agent/*.md. It does not call external APIs
and is safe for cron/watchdog use.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "docker" / "backend"
BACKEND_PYTHON = BACKEND / ".venv" / "bin" / "python"
if BACKEND_PYTHON.exists() and Path(sys.prefix).resolve() != (BACKEND / ".venv").resolve():
    import os

    os.execv(str(BACKEND_PYTHON), [str(BACKEND_PYTHON), *sys.argv])
sys.path.insert(0, str(BACKEND))

from services import ExerciseService  # noqa: E402
from curriculum import A1_UNITS  # noqa: E402

LANGS = ["de", "fr", "ru", "jp", "en"]
LANG_NAMES = ExerciseService.LANGUAGE_NAMES
CURRICULUM_TOPIC_LABELS = {topic.casefold() for unit in A1_UNITS for topic in unit["topics"]}

GENERIC_PROMPTS = [
    "combine itens do contexto",
    "responda rápido",
    "conversa real",
    "placa/cardápio",
    "microfrase",
]
BAD_CONTEXT_OPENERS = ["I read ", "Ich lese ", "Je lis ", "J'entends ", "Я читаю ", "Я слышу "]
COMPLEX_META_MARKERS = {
    "de": ["das Wort "],
    "fr": ["le mot "],
    "ru": ["слово "],
    "jp": ["という言葉"],
    "en": ["the word "],
}

SEQUENCE_ORDER_MARKERS = [
    "primeiro", "depois", "em seguida", "por fim",
    "saudação", "pedido", "pagamento", "agradecimento", "despedida",
    "nome", "origem", "onde mora", "idioma que fala",
]

ALLOWED_BOOK_LABELS = {"livro", "estudo"}


def looks_like_sentence(text: str) -> bool:
    if not isinstance(text, str):
        return False
    stripped = text.strip()
    if not stripped:
        return False
    return any(mark in stripped for mark in ".?!。؟") or len(stripped.split()) >= 3


def looks_like_topic_label(text: str) -> bool:
    if not isinstance(text, str):
        return False
    stripped = text.strip()
    if not stripped:
        return False
    return len(stripped.split()) <= 2 and not any(mark in stripped for mark in ".?!。؟")


def canonical_answer_leaks_in_prompt(answer, prompt: str) -> bool:
    if not isinstance(answer, str) or not answer:
        return False
    return answer.casefold() in visible_prompt(prompt).casefold()


def context_for_index(idx_zero: int) -> dict[str, int | str]:
    base_count = len(A1_UNITS) * 100
    if idx_zero >= base_count:
        base_idx = (len(A1_UNITS) - 1) * 100 + ((idx_zero - base_count) % 10) + 90
    else:
        base_idx = idx_zero
    unit_number = base_idx // 100 + 1
    within_unit = base_idx % 100
    topic_number = within_unit // 10 + 1
    question_in_session = idx_zero % 10 + 1
    unit = A1_UNITS[unit_number - 1]
    topic = unit["topics"][topic_number - 1]
    return {
        "unit_number": unit_number,
        "unit_title": unit["title"],
        "topic_number": topic_number,
        "topic": topic,
        "session_number": idx_zero // 20 + 1,
        "question_in_session": question_in_session,
    }


def answer_value(item: dict):
    answer = item.get("answer") or {}
    return answer.get("value", answer.get("pairs"))


def phrase_keys_for_repetition(item: dict) -> set[str]:
    keys: set[str] = set()
    answer = answer_value(item)
    if isinstance(answer, str):
        keys.add(answer.casefold().strip())
    elif isinstance(answer, list):
        if all(isinstance(part, str) for part in answer):
            keys.add(" ".join(answer).casefold().strip())
        else:
            for pair in answer:
                if isinstance(pair, list) and pair and isinstance(pair[0], str):
                    keys.add(pair[0].casefold().strip())
    for pair in item.get("pairs") or []:
        if isinstance(pair, list) and pair and isinstance(pair[0], str):
            keys.add(pair[0].casefold().strip())
    return {key for key in keys if key}


def visible_prompt(prompt: str) -> str:
    return prompt.split(": ", 1)[-1] if ": " in prompt else prompt


def review_item(language: str, idx_zero: int, item: dict) -> dict:
    issues: list[dict[str, str]] = []
    prompt = item.get("prompt") or ""
    folded = prompt.casefold()
    item_type = item.get("type")
    answer = answer_value(item)

    for fragment in GENERIC_PROMPTS:
        if fragment in folded:
            issues.append({"severity": "high", "code": "generic_prompt", "message": f"Prompt genérico: {fragment}"})

    if item_type == "choice":
        if any(fragment in folded for fragment in ["relacione", "observe a imagem", "monte "]):
            issues.append({"severity": "high", "code": "type_prompt_mismatch", "message": "Choice usa enunciado de outro tipo de exercício."})
        options = item.get("options") or []
        if isinstance(answer, str) and answer not in options:
            issues.append({"severity": "blocker", "code": "answer_missing_from_options", "message": "Resposta correta não aparece nas opções."})
        if canonical_answer_leaks_in_prompt(answer, prompt):
            issues.append({"severity": "high", "code": "visible_answer_leak", "message": "Resposta canônica aparece no enunciado visível."})
        context = context_for_index(idx_zero)
        topic = str(context.get("topic", ""))
        asks_topic_label = topic and f"“{topic.casefold()}”" in folded
        if asks_topic_label and looks_like_topic_label(topic) and isinstance(answer, str) and looks_like_sentence(answer):
            issues.append({"severity": "high", "code": "topic_label_sentence_mismatch", "message": "Prompt pede rótulo/tópico isolado, mas a resposta correta é uma frase completa."})

    if item_type == "listen_choice" and "ouça" not in folded:
        issues.append({"severity": "medium", "code": "missing_listening_cue", "message": "Listen choice não deixa claro que há áudio."})

    if item_type == "image_choice":
        options = item.get("options") or []
        if isinstance(answer, str) and answer in prompt:
            issues.append({"severity": "high", "code": "answer_leak", "message": "Resposta estrangeira aparece no prompt de image choice."})
        if "(" in visible_prompt(prompt) and ")" in visible_prompt(prompt):
            issues.append({"severity": "medium", "code": "suspicious_parentheses", "message": "Prompt visível contém parênteses; conferir se não vaza resposta."})
        if isinstance(answer, str) and answer not in [opt.get("value") for opt in options if isinstance(opt, dict)]:
            issues.append({"severity": "blocker", "code": "answer_missing_from_image_options", "message": "Resposta correta não aparece nas opções de imagem."})
        generic_book = [
            opt for opt in options
            if isinstance(opt, dict)
            and opt.get("icon_key") == "book"
            and opt.get("label_pt") not in ALLOWED_BOOK_LABELS
        ]
        if generic_book:
            issues.append({"severity": "medium", "code": "generic_book_icon", "message": "Image choice usa ícone genérico book para conceito não-livro."})

    if item_type in {"build", "listen_build"}:
        tokens = answer if isinstance(answer, list) else []
        if len(tokens) < 2:
            issues.append({"severity": "high", "code": "single_token_build", "message": "Montagem trivial com menos de dois tokens."})

    if item_type in {"match", "listen_match"}:
        pairs = item.get("pairs") or []
        if item_type == "match" and "relacione" not in folded:
            issues.append({"severity": "medium", "code": "unclear_match_prompt", "message": "Match não explica claramente a relação frase ↔ significado."})
        if item_type == "listen_match" and not all(word in folded for word in ["ouça", "tradução", "português"]):
            issues.append({"severity": "medium", "code": "unclear_listen_match_prompt", "message": "Listen match deve explicar áudio no idioma estudado → tradução em português."})
        if len(pairs) != 4:
            issues.append({"severity": "high", "code": "bad_match_pair_count", "message": "Match deveria ter 4 pares."})
        if "tradução" in folded or "significado" in folded:
            bad_translation_labels = [
                pair for pair in pairs
                if isinstance(pair, list)
                and len(pair) == 2
                and looks_like_sentence(str(pair[0]))
                and str(pair[1]).strip().casefold() in CURRICULUM_TOPIC_LABELS
            ]
            if bad_translation_labels:
                issues.append({"severity": "high", "code": "match_translation_is_topic_label", "message": "Match/listen_match promete tradução, mas o português é só rótulo/tópico."})

    if item_type == "sequence_dialogue":
        if "fluxo lógico da situação" in folded or not any(marker in folded for marker in SEQUENCE_ORDER_MARKERS):
            issues.append({"severity": "high", "code": "sequence_missing_explicit_order", "message": "Sequence dialogue não ensina a ordem esperada; vira chute."})
        phrases = answer if isinstance(answer, list) else []
        if len(phrases) != 4:
            issues.append({"severity": "high", "code": "bad_sequence_card_count", "message": "Sequence dialogue deveria ter 4 cartas."})
        for phrase in phrases:
            if isinstance(phrase, str) and phrase.casefold() in visible_prompt(prompt).casefold():
                issues.append({"severity": "high", "code": "sequence_answer_leak", "message": "Sequence dialogue vaza frase-alvo no enunciado."})
                break

    if item_type in {"match", "listen_match", "image_choice", "sequence_dialogue"}:
        blob = repr(answer) + repr(item.get("options")) + repr(item.get("pairs")) + repr(item.get("tiles"))
        for marker in COMPLEX_META_MARKERS[language]:
            if marker in blob:
                issues.append({"severity": "medium", "code": "metalinguistic_complex_item", "message": f"Tarefa complexa usa filler metalinguístico: {marker.strip()}"})

    if item_type == "context_choice" and any(marker in prompt for marker in BAD_CONTEXT_OPENERS):
        issues.append({"severity": "high", "code": "metalinguistic_context_opener", "message": "Microdiálogo abre com frase metalinguística/artificial."})

    severity_rank = {"blocker": 4, "high": 3, "medium": 2, "low": 1}
    max_severity = "none"
    if issues:
        max_severity = max((issue["severity"] for issue in issues), key=lambda sev: severity_rank[sev])
    verdict = "PASS" if not issues else ("BLOCK" if max_severity in {"blocker", "high"} else "REVISE")
    return {
        "language": language,
        "language_name": LANG_NAMES[language],
        "index": idx_zero + 1,
        **context_for_index(idx_zero),
        "type": item_type,
        "prompt": prompt,
        "answer": answer,
        "verdict": verdict,
        "severity": max_severity,
        "issues": issues,
    }


def add_repetition_verdicts(rows: list[dict], max_repetitions: int = 5) -> list[dict]:
    """BLOCK a session when the same phrase appears in more than five exercises.

    Individual items can be valid, but a session with 6+ exercises anchored on
    the same phrase feels repetitive and must be regenerated/refeita by QA.
    """
    grouped: dict[tuple[str, int], list[dict]] = {}
    for row in rows:
        grouped.setdefault((row["language"], row["session_number"]), []).append(row)

    for (_language, session_number), session_rows in grouped.items():
        counts: Counter[str] = Counter()
        row_keys: dict[int, set[str]] = {}
        for row in session_rows:
            item = {"answer": {"value": row.get("answer")}, "pairs": row.get("pairs")}
            keys = phrase_keys_for_repetition(item)
            row_keys[id(row)] = keys
            counts.update(keys)
        over_limit = {phrase: count for phrase, count in counts.items() if count > max_repetitions}
        if not over_limit:
            continue
        message = (
            f"Sessão {session_number} repete a mesma frase em mais de {max_repetitions} exercícios; "
            "POLYGLOT-QA deve pedir para refazer/regenerar o bloco. "
            f"Repetições: {dict(over_limit)}"
        )
        for row in session_rows:
            if row_keys[id(row)] & set(over_limit):
                row["issues"].append({"severity": "high", "code": "same_phrase_repeated_more_than_five_in_session", "message": message})
                row["severity"] = "high"
                row["verdict"] = "BLOCK"
    return rows


def generate_reviews(limit: int | None, recent: int | None, languages: list[str]) -> list[dict]:
    rows: list[dict] = []
    for language in languages:
        items = ExerciseService.generate_items(language)
        indexed = list(enumerate(items))
        if recent:
            indexed = indexed[-recent:]
        if limit:
            indexed = indexed[:limit]
        rows.extend(review_item(language, idx, item) for idx, item in indexed)
    return add_repetition_verdicts(rows)


def call_9router_review(model: str, rows: list[dict], counts: Counter, issues: Counter) -> dict:
    flagged = [row for row in rows if row["verdict"] != "PASS"][:30]
    examples = flagged or rows[:30]
    prompt = (
        "Revise como auditor crítico máximo de conteúdo Polyglot para iniciante absoluto. "
        "Confirme se deve PASS/REVISE/BLOCK e liste gaps. Use só estes dados. "
        "Se issue codes estiver vazio e as amostras estiverem coerentes, pode dar PASS.\n\n"
        f"Verdicts: {dict(counts)}\nIssue codes: {dict(issues)}\n"
        f"Examples: {json.dumps(examples, ensure_ascii=False)[:18000]}"
    )
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Você é auditor rigoroso de exercícios de idiomas. Seja conciso e bloqueie conteúdo ambíguo."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 900,
        "stream": False,
    }
    request = urllib.request.Request(
        "http://127.0.0.1:20128/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        raw = urllib.request.urlopen(request, timeout=300).read().decode("utf-8", errors="replace")
        try:
            data = json.loads(raw)
            content = data["choices"][0]["message"].get("content", "")
        except json.JSONDecodeError:
            chunks: list[str] = []
            for chunk in raw.split("\n\n"):
                if not chunk.startswith("data: "):
                    continue
                body = chunk[6:]
                if body.strip() == "[DONE]":
                    continue
                try:
                    obj = json.loads(body)
                    chunks.append(obj.get("choices", [{}])[0].get("delta", {}).get("content", ""))
                except Exception:
                    continue
            content = "".join(chunks)
        content = content.strip()
        if not content:
            return {"model": model, "status": "blocked", "error": "empty model review response"}
        return {"model": model, "status": "ok", "review": content}
    except Exception as exc:
        return {"model": model, "status": "blocked", "error": repr(exc)}


def run_model_reviews(rows: list[dict], counts: Counter, issues: Counter) -> list[dict]:
    return [
        call_9router_review("9router/cx/gpt-5.5", rows, counts, issues),
        call_9router_review("9router/kimi/kimi-k2.6", rows, counts, issues),
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--language", action="append", choices=LANGS, help="Language code; repeatable. Default: all.")
    parser.add_argument("--recent", type=int, default=None, help="Review the last N generated items per language.")
    parser.add_argument("--limit", type=int, default=None, help="Review the first N selected items per language.")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of Markdown summary.")
    parser.add_argument("--skip-model-review", action="store_true", help="Do not call GPT/Kimi through 9Router. Use only for offline/unit tests.")
    args = parser.parse_args()

    languages = args.language or LANGS
    rows = generate_reviews(args.limit, args.recent, languages)
    counts = Counter(row["verdict"] for row in rows)
    issues = Counter(issue["code"] for row in rows for issue in row["issues"])
    model_reviews = [] if args.skip_model_review else run_model_reviews(rows, counts, issues)

    if args.json:
        print(json.dumps({"total": len(rows), "verdicts": counts, "issue_codes": issues, "model_reviews": model_reviews, "items": rows}, ensure_ascii=False, indent=2))
        return 0

    print("## POLYGLOT-QA Review")
    print(f"- Total reviewed: {len(rows)}")
    print(f"- Verdicts: {dict(counts)}")
    print(f"- Top issue codes: {issues.most_common(10)}")
    print(f"- Model reviews: {[{'model': r.get('model'), 'status': r.get('status')} for r in model_reviews]}")
    flagged = [row for row in rows if row["verdict"] != "PASS"][:20]
    if flagged:
        print("\n## Flagged examples")
        for row in flagged:
            print(f"- **{row['verdict']}** {row['language']} #{row['index']} session {row['session_number']} q{row['question_in_session']} `{row['type']}`")
            print(f"  - Prompt: {row['prompt']}")
            print(f"  - Issues: {', '.join(issue['code'] for issue in row['issues'])}")
    return 1 if any(row["verdict"] == "BLOCK" for row in rows) else 0


if __name__ == "__main__":
    raise SystemExit(main())
