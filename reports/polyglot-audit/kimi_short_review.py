import json
import urllib.request
from pathlib import Path
REPORT=Path('/home/victor/workspace/polyglot/reports/polyglot-audit')
summary=json.loads((REPORT/'summary_deterministic.json').read_text(encoding='utf-8'))
prompt=f"""
Revise como segundo auditor independente (Kimi) estes resultados de auditoria de exercícios de idioma para iniciante absoluto/criança de 5 anos.
Dados:
Total 5000. PASS 4208. BLOCK 454. REVISE 338.
Issue codes: sequence_missing_explicit_order=450; sequence_ambiguous_dialogue_flow=450; generic_book_icon=338; visible_answer_leak=4.
Por tipo: sequence_dialogue BLOCK=450, sequence_dialogue PASS=50; image_choice REVISE=338; choice BLOCK=4.
Exemplo de problema: prompt “monte uma sequência curta; ordene as frases pelo fluxo lógico da situação” com resposta esperada “Hallo → Ich möchte einen Kaffee → Ein Wasser, bitte → Ich möchte ein Brot”, sem explicar ao aprendiz essa ordem.
Outro exemplo citado pelo usuário: restaurante usa palavras ainda não ensinadas como ohne, Vielen, Was, Empfehlen, Sie, e o aluno fica chutando.

Responda em PT-BR, curto mas completo:
- verdict geral;
- concorda ou discorda dos bloqueios;
- principais gaps;
- critérios de correção;
- testes/regressões necessários.
"""
payload={'model':'kimi/kimi-k2.6','messages':[{'role':'system','content':'Você é auditor crítico de pedagogia language-learning. Não use raciocínio oculto na resposta; entregue só o relatório final.'},{'role':'user','content':prompt}], 'temperature':0.1, 'max_tokens':1200, 'stream':False}
req=urllib.request.Request('http://127.0.0.1:11434/v1/chat/completions', data=json.dumps(payload).encode(), headers={'Content-Type':'application/json'}, method='POST')
raw=urllib.request.urlopen(req, timeout=600).read().decode(errors='replace')
content=''
try:
    obj=json.loads(raw); content=obj['choices'][0]['message'].get('content','')
except Exception:
    parts=[]
    for chunk in raw.split('\n\n'):
        if not chunk.startswith('data: '): continue
        body=chunk[6:]
        if body.strip()=='[DONE]': continue
        try: obj=json.loads(body)
        except Exception: continue
        delta=obj.get('choices',[{}])[0].get('delta',{})
        parts.append(delta.get('content',''))
    content=''.join(parts)
(REPORT/'kimi_review.md').write_text(content,encoding='utf-8')
print(content)
