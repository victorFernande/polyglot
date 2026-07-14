#!/usr/bin/env python3
"""Audit duplicate phrases across all Polyglot exercise items/languages.

Read-only deterministic audit. Reports repeated prompts, repeated answer phrases,
repeated target phrases inside match/listen_match/sequence/build items, and sessions
where one phrase anchors too many questions.
"""
from __future__ import annotations

import json
import re
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "docker" / "backend" / "polyglot.db"
OUT_DIR = ROOT / "reports" / "polyglot-audit"
OUT_JSON = OUT_DIR / "all_language_duplicate_audit.json"
OUT_MD = OUT_DIR / "all_language_duplicate_audit.md"

PT_TARGET_PATTERNS = [
    re.compile(r"(?:comunicar|representa|identifique|dizer|perguntar|pergunta que comunica|fala que comunica)\s+[“\"]([^”\"]+)[”\"]", re.IGNORECASE),
    re.compile(r"para\s+dizer\s+[“\"]([^”\"]+)[”\"]", re.IGNORECASE),
    re.compile(r"—\s*[“\"]([^”\"]+)[”\"]", re.IGNORECASE),
]
UNIT_TOPIC_RE = re.compile(r"Unidade\s+(\d+)/(\d+)\s+—\s+([^·]+?)\s+·\s+(?:Tópico\s+(\d+)/(\d+)\s+—\s+([^:]+):|Revisão guiada:)")


def parse_json(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return value


def norm(s: Any) -> str:
    if s is None:
        return ""
    if isinstance(s, list):
        s = " ".join(str(x) for x in s)
    else:
        s = str(s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s


def clean_prompt(prompt: str) -> str:
    return re.sub(r"^Unidade\s+\d+/\d+\s+—\s+.*?[:：]\s*", "", prompt or "").strip()


def answer_phrases(row: dict[str, Any]) -> list[str]:
    ans = parse_json(row.get("answer"))
    pairs = parse_json(row.get("pairs"))
    typ = row.get("type")
    out: list[str] = []
    if typ in {"match", "listen_match"}:
        # Match/listen_match intentionally contain several phrases; count the
        # whole exercise as one anchor instead of inflating every phrase inside it.
        if isinstance(ans, dict) and isinstance(ans.get("pairs"), list):
            return [json.dumps(ans["pairs"], ensure_ascii=False, sort_keys=True)]
        if isinstance(pairs, list):
            return [json.dumps(pairs, ensure_ascii=False, sort_keys=True)]

    if isinstance(ans, dict):
        if "value" in ans:
            val = ans["value"]
            if isinstance(val, list):
                if row.get("type") == "sequence_dialogue" and all(isinstance(part, str) for part in val):
                    out.extend(str(part) for part in val)
                else:
                    out.append(" ".join(map(str, val)))
            else:
                out.append(str(val))
        if "pairs" in ans and isinstance(ans["pairs"], list):
            out.append(json.dumps(ans["pairs"], ensure_ascii=False, sort_keys=True))
    elif isinstance(ans, list):
        out.append(" ".join(map(str, ans)))
    elif ans:
        out.append(str(ans))
    return [x for x in out if norm(x)]


def prompt_target_pt(prompt: str) -> str:
    text = prompt or ""
    for pattern in PT_TARGET_PATTERNS:
        matches = pattern.findall(text)
        if matches:
            return matches[-1].strip()
    return ""


def session_no(order_index: int) -> int:
    return ((order_index - 1) // 20) + 1


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    rows = [dict(r) for r in con.execute(
        """
        select i.*, l.language_code, l.language_name, l.title lesson_title
        from exercise_items i join exercise_lessons l on l.id=i.lesson_id
        order by l.language_code, i.order_index, i.id
        """
    )]

    for r in rows:
        r["session_number"] = session_no(int(r["order_index"]))
        m = UNIT_TOPIC_RE.search(r.get("prompt") or "")
        r["unit"] = int(m.group(1)) if m else None
        r["topic"] = int(m.group(4)) if m and m.group(4) else None
        r["prompt_core"] = clean_prompt(r.get("prompt") or "")
        r["prompt_target_pt"] = prompt_target_pt(r.get("prompt") or "")
        r["answer_phrases"] = answer_phrases(r)

    # Duplicate answer/target anchors inside each 20-question session.
    session_issues = []
    for (lang, sess), items in defaultdict(list, { }).items():
        pass
    by_session: dict[tuple[str,int], list[dict[str,Any]]] = defaultdict(list)
    for r in rows:
        by_session[(r["language_code"], r["session_number"])].append(r)

    for (lang, sess), items in sorted(by_session.items()):
        answer_map: dict[str, list[dict[str,Any]]] = defaultdict(list)
        prompt_pt_map: dict[str, list[dict[str,Any]]] = defaultdict(list)
        prompt_core_map: dict[str, list[dict[str,Any]]] = defaultdict(list)
        for r in items:
            seen_phrases_for_item = set()
            for phrase in r["answer_phrases"]:
                phrase_key = norm(phrase)
                if phrase_key in seen_phrases_for_item:
                    continue
                seen_phrases_for_item.add(phrase_key)
                answer_map[phrase_key].append(r | {"duplicate_phrase": phrase})
            if norm(r["prompt_target_pt"]):
                prompt_pt_map[norm(r["prompt_target_pt"])].append(r)
            if norm(r["prompt_core"]):
                prompt_core_map[norm(r["prompt_core"])].append(r)

        for key, occ in answer_map.items():
            if len(occ) > 6:
                session_issues.append({
                    "issue_code": "SESSION_REPEATED_ANSWER_PHRASE_GT6",
                    "severity": "BLOCK",
                    "language": lang,
                    "session_number": sess,
                    "phrase": occ[0]["duplicate_phrase"],
                    "count": len(occ),
                    "items": [{"id": x["id"], "order_index": x["order_index"], "type": x["type"], "prompt": x["prompt"]} for x in occ],
                })
        for key, occ in prompt_pt_map.items():
            if len(occ) > 6:
                session_issues.append({
                    "issue_code": "SESSION_REPEATED_PROMPT_TARGET_PT_GT6",
                    "severity": "BLOCK",
                    "language": lang,
                    "session_number": sess,
                    "phrase": occ[0]["prompt_target_pt"],
                    "count": len(occ),
                    "items": [{"id": x["id"], "order_index": x["order_index"], "type": x["type"], "prompt": x["prompt"]} for x in occ],
                })
        for key, occ in prompt_core_map.items():
            if len(occ) > 6:
                session_issues.append({
                    "issue_code": "SESSION_IDENTICAL_PROMPT_CORE_GT6",
                    "severity": "BLOCK",
                    "language": lang,
                    "session_number": sess,
                    "phrase": occ[0]["prompt_core"],
                    "count": len(occ),
                    "items": [{"id": x["id"], "order_index": x["order_index"], "type": x["type"], "prompt": x["prompt"]} for x in occ],
                })

    # Corpus-wide phrase reuse: report top answer phrases per language, excluding very short/function words.
    corpus = []
    for lang in sorted({r["language_code"] for r in rows}):
        c = Counter()
        examples: dict[str, list[dict[str,Any]]] = defaultdict(list)
        for r in rows:
            if r["language_code"] != lang:
                continue
            for phrase in r["answer_phrases"]:
                k = norm(phrase)
                if len(k) < 4:
                    continue
                c[k] += 1
                if len(examples[k]) < 8:
                    examples[k].append({"id": r["id"], "order_index": r["order_index"], "session_number": r["session_number"], "type": r["type"], "phrase": phrase})
        for k, count in c.most_common(20):
            if count >= 10:
                corpus.append({"language": lang, "phrase": examples[k][0]["phrase"], "count": count, "examples": examples[k]})

    issue_counts = Counter((x["issue_code"], x["severity"]) for x in session_issues)
    by_lang = Counter(x["language"] for x in session_issues)
    result = {
        "total_items": len(rows),
        "languages": sorted({r["language_code"] for r in rows}),
        "total_session_issues": len(session_issues),
        "issue_counts": {f"{k[0]}:{k[1]}": v for k, v in issue_counts.items()},
        "issues_by_language": dict(by_lang),
        "session_issues": session_issues,
        "corpus_top_reuse": corpus,
    }
    OUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append("# Auditoria global de duplicação — Polyglot")
    lines.append("")
    lines.append(f"- Total de itens: {len(rows)}")
    lines.append(f"- Idiomas: {', '.join(result['languages'])}")
    lines.append(f"- Issues por sessão: {len(session_issues)}")
    lines.append("")
    lines.append("## Contagem por tipo")
    for k,v in sorted(result["issue_counts"].items()):
        lines.append(f"- {k}: {v}")
    lines.append("")
    lines.append("## Contagem por idioma")
    for k,v in sorted(by_lang.items()):
        lines.append(f"- {k}: {v}")
    lines.append("")
    lines.append("## Primeiros achados acionáveis")
    for issue in session_issues[:60]:
        lines.append(f"### {issue['severity']} · {issue['issue_code']} · {issue['language']} sessão {issue['session_number']} · {issue['count']}x")
        lines.append(f"Frase: `{issue['phrase']}`")
        for item in issue["items"][:8]:
            lines.append(f"- id {item['id']} · q{item['order_index']} · {item['type']} · {item['prompt']}")
        lines.append("")
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({k: result[k] for k in ["total_items","languages","total_session_issues","issue_counts","issues_by_language"]}, ensure_ascii=False, indent=2))
    print(OUT_JSON)
    print(OUT_MD)
    return 1 if session_issues else 0

if __name__ == "__main__":
    raise SystemExit(main())
