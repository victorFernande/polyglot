import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path('/home/victor/workspace/polyglot')
REPORT = ROOT / 'reports/polyglot-audit'
summary = json.loads((REPORT / 'summary_deterministic.json').read_text(encoding='utf-8'))
examples = summary['top_examples'][:30]

model = sys.argv[1]
out_path = Path(sys.argv[2])

prompt = f"""
Você é revisor sênior de conteúdo de app de idiomas para iniciante absoluto, criança de 5 anos.
Audite estes achados de 5.000 exercícios Polyglot. Não invente dados: use somente o resumo e exemplos abaixo.
Critérios:
- enunciado precisa dar contexto suficiente sem dar a resposta;
- sequência de diálogo deve explicar a ordem esperada;
- vocabulário novo deve ser apresentado/scaffolded antes de exercícios complexos;
- não pode virar chute;
- bloqueie pedagogia fraca.

Resumo determinístico:
{json.dumps({k: summary[k] for k in ['total','verdicts','severity','issue_codes','by_type','by_language']}, ensure_ascii=False, indent=2)}

Exemplos sinalizados:
{json.dumps(examples, ensure_ascii=False, indent=2)[:30000]}

Responda em PT-BR com:
1. Verdict geral: PASS/REVISE/BLOCK.
2. Principais gaps por severidade.
3. O que deve ser corrigido primeiro.
4. Regras concretas para regenerar/corrigir todos os exercícios.
5. Riscos de answer leak e como evitar.
6. Uma lista curta de regressões/testes que devem existir.
"""

payload = {
    'model': model,
    'messages': [
        {'role': 'system', 'content': 'Você é um auditor rigoroso de conteúdo pedagógico para language learning. Seja direto e técnico.'},
        {'role': 'user', 'content': prompt},
    ],
    'temperature': 0.1,
    'max_tokens': 2500,
    'stream': False,
}
req = urllib.request.Request(
    'http://127.0.0.1:11434/v1/chat/completions',
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='POST',
)
raw = urllib.request.urlopen(req, timeout=600).read().decode('utf-8', errors='replace')
try:
    data = json.loads(raw)
    content = data['choices'][0]['message'].get('content', '')
except json.JSONDecodeError:
    # Some routed models return SSE even with stream false.
    chunks = []
    for part in raw.split('\n\n'):
        part = part.strip()
        if not part.startswith('data: '):
            continue
        body = part[6:]
        if body == '[DONE]':
            continue
        try:
            obj = json.loads(body)
        except Exception:
            continue
        delta = obj.get('choices', [{}])[0].get('delta', {})
        if 'content' in delta:
            chunks.append(delta['content'])
    content = ''.join(chunks)
out_path.write_text(content, encoding='utf-8')
print(str(out_path))
print(content[:1200])
