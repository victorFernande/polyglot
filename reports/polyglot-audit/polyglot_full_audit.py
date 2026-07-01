import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path('/home/victor/workspace/polyglot')
sys.path.insert(0, str(ROOT / 'docker/backend'))
from services import ExerciseService  # noqa: E402
from curriculum import A1_UNITS  # noqa: E402

LANGS = ['de', 'fr', 'ru', 'jp', 'en']
LANG_NAMES = ExerciseService.LANGUAGE_NAMES
SEVERITY_RANK = {'info': 0, 'low': 1, 'medium': 2, 'high': 3, 'blocker': 4}
TOKEN_RE = re.compile(r"[\wÀ-ÿА-Яа-яÄÖÜäöüßÉÈÊËéèêëÇç]+", re.UNICODE)
INTRO_STOP = {
    'de': {'ich', 'ist', 'das', 'ein', 'eine', 'einen', 'der', 'die', 'und', 'bitte', 'ja', 'nein', 'du', 'sie', 'mein', 'meine', 'bin', 'habe', 'zu', 'in', 'am', 'um', 'von', 'bis'},
    'fr': {'je', 'j', 'ai', 'un', 'une', 'le', 'la', 'les', 'de', 'des', 'du', 'est', 'suis', 'vous', 'mon', 'ma', 'mes', 'et', 'à', 'en', 's', 'il', 'plaît'},
    'ru': {'я', 'у', 'это', 'мой', 'моя', 'мне', 'есть', 'в', 'на', 'и', 'с', 'вы', 'он', 'она'},
    'jp': set(),
    'en': {'i', 'a', 'an', 'the', 'is', 'am', 'are', 'my', 'you', 'have', 'has', 'to', 'in', 'at', 'on', 'please', 'this', 'that', 'do', 'does'},
}
SPECIFIC_SEQUENCE_MARKERS = [
    'nome', 'origem', 'onde mora', 'idioma', 'primeiro', 'depois', 'em seguida', 'por fim',
    'começo', 'meio', 'final', 'saudação', 'pedido', 'pagamento', 'agradecimento', 'despedida',
    'apresentação', 'pergunta', 'resposta', 'fechamento'
]


def ctx(idx_zero):
    unit_number = idx_zero // 100 + 1
    within_unit = idx_zero % 100
    topic_number = within_unit // 10 + 1
    question_in_topic = idx_zero % 10 + 1
    session_number = idx_zero // ExerciseService.SESSION_SIZE + 1
    session_question = idx_zero % ExerciseService.SESSION_SIZE + 1
    unit = A1_UNITS[unit_number - 1]
    return unit_number, unit['title'], topic_number, unit['topics'][topic_number - 1], question_in_topic, session_number, session_question


def answer_value(item):
    answer = item.get('answer') or {}
    return answer.get('value', answer.get('pairs'))


def visible_prompt(prompt):
    return prompt.split(': ', 1)[-1] if ': ' in prompt else prompt


def foreign_texts(item):
    typ = item['type']
    vals = []
    ans = item.get('answer') or {}
    if typ in {'choice', 'listen_choice', 'context_choice'}:
        vals += [x for x in item.get('options') or [] if isinstance(x, str)]
    elif typ == 'image_choice':
        vals += [o.get('value', '') for o in item.get('options') or [] if isinstance(o, dict)]
    elif typ in {'build', 'listen_build', 'sequence_dialogue'}:
        v = ans.get('value')
        if isinstance(v, list):
            vals += [' '.join(v) if all(isinstance(x, str) and len(x) < 20 for x in v) else str(x) for x in v]
    elif typ in {'match', 'listen_match'}:
        vals += [p[0] for p in item.get('pairs') or []]
    return [str(v) for v in vals if v]


def content_tokens(lang, texts):
    if lang == 'jp':
        return []
    toks = []
    for text in texts:
        for tok in TOKEN_RE.findall(text.casefold()):
            if len(tok) <= 2 or tok in INTRO_STOP.get(lang, set()):
                continue
            if tok.isnumeric():
                continue
            toks.append(tok)
    return toks


def audit_item(lang, idx_zero, item, learned_tokens):
    unit_number, unit_title, topic_number, topic_name, question_in_topic, session_number, session_question = ctx(idx_zero)
    prompt = item.get('prompt') or ''
    visible = visible_prompt(prompt)
    folded = prompt.casefold()
    visible_folded = visible.casefold()
    typ = item.get('type')
    ans = item.get('answer') or {}
    answer = answer_value(item)
    issues = []

    def add(severity, code, message):
        issues.append({'severity': severity, 'code': code, 'message': message})

    if typ == 'sequence_dialogue':
        phrases = ans.get('value') or []
        if not any(marker in visible_folded for marker in SPECIFIC_SEQUENCE_MARKERS):
            add('high', 'sequence_missing_explicit_order', 'Sequência pede fluxo lógico sem dizer a ordem esperada; aprendiz chuta.')
        if unit_title != 'Apresente-se' and not any(marker in visible_folded for marker in ['primeiro', 'depois', 'em seguida', 'por fim', 'saudação', 'pedido', 'pagamento', 'agradecimento', 'despedida']):
            phrase_list = ' | '.join(phrases)
            add('high', 'sequence_ambiguous_dialogue_flow', f'Ordem do diálogo não é ensinada no enunciado: {phrase_list}')
        if len(phrases) != 4:
            add('high', 'sequence_wrong_card_count', 'Sequence dialogue deveria ter 4 cartas.')

    if typ in {'match', 'listen_match'}:
        pairs = item.get('pairs') or []
        if len(pairs) != 4:
            add('high', 'bad_match_pair_count', 'Match/listen_match deveria ter 4 pares.')
        if typ == 'match' and 'relacione' not in folded:
            add('medium', 'match_unclear_relation', 'Match não explica claramente a relação frase ↔ significado.')
        if typ == 'listen_match' and not all(word in folded for word in ['ouça', 'tradução', 'português']):
            add('medium', 'listen_match_unclear', 'Listen match deve dizer áudio → tradução em português.')

    if typ in {'choice', 'image_choice', 'context_choice'}:
        v = ans.get('value')
        if isinstance(v, str) and v and v.casefold() in visible_folded and typ != 'listen_choice':
            add('high', 'visible_answer_leak', 'Resposta canônica aparece no enunciado visível.')

    if typ in {'build', 'listen_build'}:
        tokens = answer if isinstance(answer, list) else []
        if len(tokens) < 2:
            add('high', 'single_token_build', 'Montagem trivial com menos de dois tokens.')

    ftexts = foreign_texts(item)
    toks = content_tokens(lang, ftexts)
    unseen = sorted(set(tok for tok in toks if tok not in learned_tokens))
    if typ in {'sequence_dialogue', 'match', 'listen_match', 'build', 'listen_build'} and len(unseen) >= 3:
        unseen_list = ', '.join(unseen[:8])
        add('medium', 'unscaffolded_new_vocabulary', f'Introduz várias palavras novas sem scaffold explícito: {unseen_list}')

    if typ == 'image_choice':
        bad = [(o.get('label_pt'), o.get('icon_key')) for o in item.get('options') or [] if isinstance(o, dict) and o.get('icon_key') == 'book' and o.get('label_pt') not in {'livro', 'estudo'}]
        if bad:
            add('medium', 'generic_book_icon', f'Ícone genérico book para conceitos não-livro: {bad[:4]}')

    if len(visible) > 160:
        add('low', 'long_prompt', 'Prompt visível longo demais para fluxo rápido.')

    if issues:
        severity = max((issue['severity'] for issue in issues), key=lambda sev: SEVERITY_RANK[sev])
        verdict = 'BLOCK' if SEVERITY_RANK[severity] >= 3 else 'REVISE'
    else:
        severity = 'none'
        verdict = 'PASS'

    for tok in toks:
        learned_tokens.add(tok)

    return {
        'language': lang,
        'language_name': LANG_NAMES[lang],
        'index': idx_zero + 1,
        'session': session_number,
        'session_question': session_question,
        'unit': unit_number,
        'unit_title': unit_title,
        'topic': topic_number,
        'topic_name': topic_name,
        'question_in_topic': question_in_topic,
        'type': typ,
        'prompt': prompt,
        'visible_prompt': visible,
        'answer': json.dumps(ans, ensure_ascii=False),
        'options': json.dumps(item.get('options'), ensure_ascii=False),
        'pairs': json.dumps(item.get('pairs'), ensure_ascii=False),
        'tiles': json.dumps(item.get('tiles'), ensure_ascii=False),
        'verdict': verdict,
        'severity': severity,
        'issue_codes': ';'.join(issue['code'] for issue in issues),
        'issues_json': json.dumps(issues, ensure_ascii=False),
    }


def main():
    rows = []
    export = []
    for lang in LANGS:
        learned = set()
        for idx, item in enumerate(ExerciseService.generate_items(lang)):
            row = audit_item(lang, idx, item, learned)
            rows.append(row)
            export.append({**row, 'raw_item': json.dumps(item, ensure_ascii=False)})

    out_dir = ROOT / 'reports/polyglot-audit'
    out_dir.mkdir(parents=True, exist_ok=True)
    fields = list(rows[0].keys())
    with (out_dir / 'full_audit_deterministic.csv').open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    with (out_dir / 'exercise_export.jsonl').open('w', encoding='utf-8') as f:
        for row in export:
            f.write(json.dumps(row, ensure_ascii=False) + '\n')

    issue_counter = Counter(code for row in rows for code in row['issue_codes'].split(';') if code)
    by_type = Counter(f"{row['type']}:{row['verdict']}" for row in rows)
    by_lang = Counter(f"{row['language']}:{row['verdict']}" for row in rows)
    examples = [row for row in rows if row['verdict'] != 'PASS'][:120]
    summary = {
        'total': len(rows),
        'verdicts': dict(Counter(row['verdict'] for row in rows)),
        'severity': dict(Counter(row['severity'] for row in rows)),
        'issue_codes': dict(issue_counter),
        'by_type': dict(by_type),
        'by_language': dict(by_lang),
        'top_examples': examples,
    }
    (out_dir / 'summary_deterministic.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: summary[k] for k in ['total', 'verdicts', 'severity', 'issue_codes']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
