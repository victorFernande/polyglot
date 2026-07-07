# Auditoria global de duplicação — Polyglot

- Total de itens: 5765
- Idiomas: de, en, fr, jp, ru
- Issues por sessão: 1322

## Contagem por tipo
- SESSION_IDENTICAL_PROMPT_CORE:REVISE: 654
- SESSION_REPEATED_ANSWER_PHRASE_GT2:BLOCK: 209
- SESSION_REPEATED_ANSWER_PHRASE_GT2:REVISE: 427
- SESSION_REPEATED_PROMPT_TARGET_PT_GT2:REVISE: 32

## Contagem por idioma
- de: 290
- en: 253
- fr: 246
- jp: 283
- ru: 250

## Primeiros achados acionáveis
### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 1 · 2x
Frase: `ouça o áudio e identifique “Eu gostaria de um café.”`
- id 34022 · q2 · listen_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 1/10 — cumprimentar: ouça o áudio e identifique “Eu gostaria de um café.”
- id 34031 · q11 · listen_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 2/10 — pedir café: ouça o áudio e identifique “Eu gostaria de um café.”

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 1 · 2x
Frase: `monte a frase em ordem natural para dizer “Eu gostaria de um pão.”`
- id 34024 · q4 · build · Unidade 1/10 — Fazendo um pedido no café · Tópico 1/10 — cumprimentar: monte a frase em ordem natural para dizer “Eu gostaria de um pão.”
- id 34033 · q13 · build · Unidade 1/10 — Fazendo um pedido no café · Tópico 2/10 — pedir café: monte a frase em ordem natural para dizer “Eu gostaria de um pão.”

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 1 · 2x
Frase: `entenda “Wie viel kostet das?” — qual é o significado em português?`
- id 34027 · q7 · choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 1/10 — cumprimentar: entenda “Wie viel kostet das?” — qual é o significado em português?
- id 34036 · q16 · choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 2/10 — pedir café: entenda “Wie viel kostet das?” — qual é o significado em português?

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 1 · 2x
Frase: `prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento`
- id 34029 · q9 · sequence_dialogue · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento
- id 34038 · q18 · sequence_dialogue · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 2 · 3x
Frase: `Wie viel kostet das?`
- id 34045 · q25 · build · Unidade 1/10 — Fazendo um pedido no café · Tópico 3/10 — pedir água: monte a frase em ordem natural para dizer “Quanto custa?”
- id 34052 · q32 · build · Unidade 1/10 — Fazendo um pedido no café · Tópico 4/10 — pedir comida: monte a frase em ordem natural para dizer “Quanto custa?”
- id 34054 · q34 · image_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 4/10 — pedir comida: observe a imagem e escolha a frase que representa “Quanto custa?”

### REVISE · SESSION_REPEATED_PROMPT_TARGET_PT_GT2 · de sessão 2 · 3x
Frase: `Quanto custa?`
- id 34045 · q25 · build · Unidade 1/10 — Fazendo um pedido no café · Tópico 3/10 — pedir água: monte a frase em ordem natural para dizer “Quanto custa?”
- id 34052 · q32 · build · Unidade 1/10 — Fazendo um pedido no café · Tópico 4/10 — pedir comida: monte a frase em ordem natural para dizer “Quanto custa?”
- id 34054 · q34 · image_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 4/10 — pedir comida: observe a imagem e escolha a frase que representa “Quanto custa?”

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 2 · 2x
Frase: `ouça o áudio e identifique “Obrigado.”`
- id 34044 · q24 · listen_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 3/10 — pedir água: ouça o áudio e identifique “Obrigado.”
- id 34053 · q33 · listen_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 4/10 — pedir comida: ouça o áudio e identifique “Obrigado.”

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 2 · 2x
Frase: `monte a frase em ordem natural para dizer “Quanto custa?”`
- id 34045 · q25 · build · Unidade 1/10 — Fazendo um pedido no café · Tópico 3/10 — pedir água: monte a frase em ordem natural para dizer “Quanto custa?”
- id 34052 · q32 · build · Unidade 1/10 — Fazendo um pedido no café · Tópico 4/10 — pedir comida: monte a frase em ordem natural para dizer “Quanto custa?”

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 2 · 2x
Frase: `prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento`
- id 34047 · q27 · sequence_dialogue · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento
- id 34059 · q39 · sequence_dialogue · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 3 · 3x
Frase: `Bitte.`
- id 34061 · q41 · image_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 5/10 — usar por favor: observe a imagem e escolha a frase que representa “Por favor.”
- id 34066 · q46 · listen_match · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: tópico 5 bloco 6 — ouça cada áudio em Alemão e selecione a tradução em português
- id 34080 · q60 · context_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 6/10 — agradecer: situação guiada — você precisa comunicar “Por favor.” no tema “agradecer”. Escolha a fala correta em Alemão.

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 3 · 3x
Frase: `Danke.`
- id 34062 · q42 · choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 5/10 — usar por favor: escolha como dizer “Obrigado.” em Alemão
- id 34066 · q46 · listen_match · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: tópico 5 bloco 6 — ouça cada áudio em Alemão e selecione a tradução em português
- id 34071 · q51 · choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 6/10 — agradecer: escolha como dizer “Obrigado.” em Alemão

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 3 · 3x
Frase: `Die Rechnung, bitte.`
- id 34064 · q44 · build · Unidade 1/10 — Fazendo um pedido no café · Tópico 5/10 — usar por favor: monte a frase em ordem natural para dizer “A conta, por favor.”
- id 34070 · q50 · sequence_dialogue · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento
- id 34073 · q53 · image_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 6/10 — agradecer: observe a imagem e escolha a frase que representa “A conta, por favor.”

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 3 · 3x
Frase: `Ein Wasser, bitte.`
- id 34066 · q46 · listen_match · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: tópico 5 bloco 6 — ouça cada áudio em Alemão e selecione a tradução em português
- id 34069 · q49 · listen_build · Unidade 1/10 — Fazendo um pedido no café · Tópico 5/10 — usar por favor: ouça e monte em ordem natural — “Uma água, por favor.”
- id 34078 · q58 · listen_build · Unidade 1/10 — Fazendo um pedido no café · Tópico 6/10 — agradecer: ouça e monte em ordem natural — “Uma água, por favor.”

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 3 · 2x
Frase: `escolha como dizer “Obrigado.” em Alemão`
- id 34062 · q42 · choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 5/10 — usar por favor: escolha como dizer “Obrigado.” em Alemão
- id 34071 · q51 · choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 6/10 — agradecer: escolha como dizer “Obrigado.” em Alemão

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 3 · 2x
Frase: `ouça e monte em ordem natural — “Uma água, por favor.”`
- id 34069 · q49 · listen_build · Unidade 1/10 — Fazendo um pedido no café · Tópico 5/10 — usar por favor: ouça e monte em ordem natural — “Uma água, por favor.”
- id 34078 · q58 · listen_build · Unidade 1/10 — Fazendo um pedido no café · Tópico 6/10 — agradecer: ouça e monte em ordem natural — “Uma água, por favor.”

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 3 · 2x
Frase: `prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento`
- id 34070 · q50 · sequence_dialogue · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento
- id 34079 · q59 · sequence_dialogue · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 4 · 3x
Frase: `Wie viel kostet das?`
- id 34081 · q61 · listen_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 7/10 — perguntar preço: ouça o áudio e identifique “Quanto custa?”
- id 34089 · q69 · listen_build · Unidade 1/10 — Fazendo um pedido no café · Tópico 7/10 — perguntar preço: ouça e monte em ordem natural — “Quanto custa?”
- id 34100 · q80 · listen_build · Unidade 1/10 — Fazendo um pedido no café · Tópico 8/10 — pedir a conta: ouça e monte em ordem natural — “Quanto custa?”

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 4 · 3x
Frase: `Die Rechnung, bitte.`
- id 34082 · q62 · choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 7/10 — perguntar preço: escolha como dizer “A conta, por favor.” em Alemão
- id 34091 · q71 · context_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 8/10 — pedir a conta: situação guiada — você precisa comunicar “A conta, por favor.” no tema “pedir a conta”. Escolha a fala correta em Alemão.
- id 34096 · q76 · listen_match · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: tópico 8 bloco 6 — ouça cada áudio em Alemão e selecione a tradução em português

### REVISE · SESSION_REPEATED_PROMPT_TARGET_PT_GT2 · de sessão 4 · 3x
Frase: `Quanto custa?`
- id 34081 · q61 · listen_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 7/10 — perguntar preço: ouça o áudio e identifique “Quanto custa?”
- id 34089 · q69 · listen_build · Unidade 1/10 — Fazendo um pedido no café · Tópico 7/10 — perguntar preço: ouça e monte em ordem natural — “Quanto custa?”
- id 34100 · q80 · listen_build · Unidade 1/10 — Fazendo um pedido no café · Tópico 8/10 — pedir a conta: ouça e monte em ordem natural — “Quanto custa?”

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 4 · 2x
Frase: `prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento`
- id 34088 · q68 · sequence_dialogue · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento
- id 34097 · q77 · sequence_dialogue · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 4 · 2x
Frase: `ouça e monte em ordem natural — “Quanto custa?”`
- id 34089 · q69 · listen_build · Unidade 1/10 — Fazendo um pedido no café · Tópico 7/10 — perguntar preço: ouça e monte em ordem natural — “Quanto custa?”
- id 34100 · q80 · listen_build · Unidade 1/10 — Fazendo um pedido no café · Tópico 8/10 — pedir a conta: ouça e monte em ordem natural — “Quanto custa?”

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 5 · 3x
Frase: `Ich möchte einen Kaffee.`
- id 34104 · q84 · image_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 9/10 — confirmar pedido: observe a imagem e escolha a frase que representa “Eu gostaria de um café.”
- id 34113 · q93 · context_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 10/10 — despedir-se: situação guiada — você precisa comunicar “Eu gostaria de um café.” no tema “despedir-se”. Escolha a fala correta em Alemão.
- id 34120 · q100 · sequence_dialogue · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 5 · 3x
Frase: `Ein Wasser, bitte.`
- id 34105 · q85 · context_choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 9/10 — confirmar pedido: situação guiada — você precisa comunicar “Uma água, por favor.” no tema “confirmar pedido”. Escolha a fala correta em Alemão.
- id 34114 · q94 · build · Unidade 1/10 — Fazendo um pedido no café · Tópico 10/10 — despedir-se: monte a frase em ordem natural para dizer “Uma água, por favor.”
- id 34120 · q100 · sequence_dialogue · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 5 · 2x
Frase: `entenda “Danke.” — qual é o significado em português?`
- id 34108 · q88 · choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 9/10 — confirmar pedido: entenda “Danke.” — qual é o significado em português?
- id 34117 · q97 · choice · Unidade 1/10 — Fazendo um pedido no café · Tópico 10/10 — despedir-se: entenda “Danke.” — qual é o significado em português?

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 5 · 2x
Frase: `prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento`
- id 34109 · q89 · sequence_dialogue · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento
- id 34120 · q100 · sequence_dialogue · Unidade 1/10 — Fazendo um pedido no café · Revisão guiada: prática guiada de ordem — organize os cartões exatamente assim: primeiro contexto; depois detalhe; em seguida resposta; por fim fechamento

### BLOCK · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 6 · 4x
Frase: `Ich heiße Victor.`
- id 34121 · q101 · choice · Unidade 2/10 — Apresente-se · Tópico 1/10 — dizer nome: escolha como dizer “Meu nome é Victor.” em Alemão
- id 34129 · q109 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34138 · q118 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34140 · q120 · context_choice · Unidade 2/10 — Apresente-se · Tópico 2/10 — dizer origem: situação guiada — você precisa comunicar “Meu nome é Victor.” no tema “dizer origem”. Escolha a fala correta em Alemão.

### BLOCK · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 6 · 4x
Frase: `Ich komme aus Brasilien.`
- id 34122 · q102 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 1/10 — dizer nome: ouça o áudio e identifique “Eu sou do Brasil.”
- id 34129 · q109 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34131 · q111 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 2/10 — dizer origem: ouça o áudio e identifique “Eu sou do Brasil.”
- id 34138 · q118 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### BLOCK · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 6 · 4x
Frase: `Ich wohne in São Paulo.`
- id 34123 · q103 · image_choice · Unidade 2/10 — Apresente-se · Tópico 1/10 — dizer nome: observe a imagem e escolha a frase que representa “Eu moro em São Paulo.”
- id 34129 · q109 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34132 · q112 · choice · Unidade 2/10 — Apresente-se · Tópico 2/10 — dizer origem: escolha como dizer “Eu moro em São Paulo.” em Alemão
- id 34138 · q118 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### BLOCK · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 6 · 4x
Frase: `Ich spreche Portugiesisch.`
- id 34124 · q104 · build · Unidade 2/10 — Apresente-se · Tópico 1/10 — dizer nome: monte a frase em ordem natural para dizer “Eu falo português.”
- id 34129 · q109 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34133 · q113 · build · Unidade 2/10 — Apresente-se · Tópico 2/10 — dizer origem: monte a frase em ordem natural para dizer “Eu falo português.”
- id 34138 · q118 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 6 · 2x
Frase: `ouça o áudio e identifique “Eu sou do Brasil.”`
- id 34122 · q102 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 1/10 — dizer nome: ouça o áudio e identifique “Eu sou do Brasil.”
- id 34131 · q111 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 2/10 — dizer origem: ouça o áudio e identifique “Eu sou do Brasil.”

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 6 · 2x
Frase: `monte a frase em ordem natural para dizer “Eu falo português.”`
- id 34124 · q104 · build · Unidade 2/10 — Apresente-se · Tópico 1/10 — dizer nome: monte a frase em ordem natural para dizer “Eu falo português.”
- id 34133 · q113 · build · Unidade 2/10 — Apresente-se · Tópico 2/10 — dizer origem: monte a frase em ordem natural para dizer “Eu falo português.”

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 6 · 2x
Frase: `entenda “Wie heißt du?” — qual é o significado em português?`
- id 34127 · q107 · choice · Unidade 2/10 — Apresente-se · Tópico 1/10 — dizer nome: entenda “Wie heißt du?” — qual é o significado em português?
- id 34136 · q116 · choice · Unidade 2/10 — Apresente-se · Tópico 2/10 — dizer origem: entenda “Wie heißt du?” — qual é o significado em português?

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 6 · 2x
Frase: `monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala`
- id 34129 · q109 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34138 · q118 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### BLOCK · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 7 · 4x
Frase: `Ich wohne in São Paulo.`
- id 34141 · q121 · context_choice · Unidade 2/10 — Apresente-se · Tópico 3/10 — dizer moradia: situação guiada — você precisa comunicar “Eu moro em São Paulo.” no tema “dizer moradia”. Escolha a fala correta em Alemão.
- id 34147 · q127 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34159 · q139 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34160 · q140 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 4/10 — dizer idioma: ouça o áudio e identifique “Eu moro em São Paulo.”

### BLOCK · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 7 · 4x
Frase: `Ich spreche Portugiesisch.`
- id 34142 · q122 · image_choice · Unidade 2/10 — Apresente-se · Tópico 3/10 — dizer moradia: observe a imagem e escolha a frase que representa “Eu falo português.”
- id 34147 · q127 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34151 · q131 · choice · Unidade 2/10 — Apresente-se · Tópico 4/10 — dizer idioma: escolha como dizer “Eu falo português.” em Alemão
- id 34159 · q139 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 7 · 3x
Frase: `Ich bin Lehrer.`
- id 34143 · q123 · choice · Unidade 2/10 — Apresente-se · Tópico 3/10 — dizer moradia: escolha como dizer “Eu sou professor.” em Alemão
- id 34152 · q132 · build · Unidade 2/10 — Apresente-se · Tópico 4/10 — dizer idioma: monte a frase em ordem natural para dizer “Eu sou professor.”
- id 34156 · q136 · match · Unidade 2/10 — Apresente-se · Revisão guiada: tópico 4 bloco 6 — relacione cada frase ao significado em português

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 7 · 3x
Frase: `Ich lerne Deutsch.`
- id 34144 · q124 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 3/10 — dizer moradia: ouça o áudio e identifique “Eu estudo alemão.”
- id 34153 · q133 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 4/10 — dizer idioma: ouça o áudio e identifique “Eu estudo alemão.”
- id 34156 · q136 · match · Unidade 2/10 — Apresente-se · Revisão guiada: tópico 4 bloco 6 — relacione cada frase ao significado em português

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 7 · 3x
Frase: `Wie heißt du?`
- id 34145 · q125 · build · Unidade 2/10 — Apresente-se · Tópico 3/10 — dizer moradia: monte a frase em ordem natural para dizer “Como você se chama?”
- id 34154 · q134 · image_choice · Unidade 2/10 — Apresente-se · Tópico 4/10 — dizer idioma: observe a imagem e escolha a frase que representa “Como você se chama?”
- id 34156 · q136 · match · Unidade 2/10 — Apresente-se · Revisão guiada: tópico 4 bloco 6 — relacione cada frase ao significado em português

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 7 · 3x
Frase: `Ich heiße Victor.`
- id 34147 · q127 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34149 · q129 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 3/10 — dizer moradia: ouça o áudio e identifique “Meu nome é Victor.”
- id 34159 · q139 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 7 · 3x
Frase: `Ich komme aus Brasilien.`
- id 34147 · q127 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34150 · q130 · listen_build · Unidade 2/10 — Apresente-se · Tópico 3/10 — dizer moradia: ouça e monte em ordem natural — “Eu sou do Brasil.”
- id 34159 · q139 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 7 · 2x
Frase: `ouça o áudio e identifique “Eu estudo alemão.”`
- id 34144 · q124 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 3/10 — dizer moradia: ouça o áudio e identifique “Eu estudo alemão.”
- id 34153 · q133 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 4/10 — dizer idioma: ouça o áudio e identifique “Eu estudo alemão.”

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 7 · 2x
Frase: `monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala`
- id 34147 · q127 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34159 · q139 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### BLOCK · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 8 · 5x
Frase: `Ich bin Lehrer.`
- id 34161 · q141 · image_choice · Unidade 2/10 — Apresente-se · Tópico 5/10 — dizer profissão: observe a imagem e escolha a frase que representa “Eu sou professor.”
- id 34162 · q142 · choice · Unidade 2/10 — Apresente-se · Tópico 5/10 — dizer profissão: escolha como dizer “Eu sou professor.” em Alemão
- id 34170 · q150 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34179 · q159 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34180 · q160 · context_choice · Unidade 2/10 — Apresente-se · Tópico 6/10 — dizer estudo: situação guiada — você precisa comunicar “Eu sou professor.” no tema “dizer estudo”. Escolha a fala correta em Alemão.

### BLOCK · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 8 · 4x
Frase: `Ich wohne in São Paulo.`
- id 34169 · q149 · listen_build · Unidade 2/10 — Apresente-se · Tópico 5/10 — dizer profissão: ouça e monte em ordem natural — “Eu moro em São Paulo.”
- id 34170 · q150 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34178 · q158 · listen_build · Unidade 2/10 — Apresente-se · Tópico 6/10 — dizer estudo: ouça e monte em ordem natural — “Eu moro em São Paulo.”
- id 34179 · q159 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### REVISE · SESSION_REPEATED_PROMPT_TARGET_PT_GT2 · de sessão 8 · 3x
Frase: `Eu sou professor.`
- id 34161 · q141 · image_choice · Unidade 2/10 — Apresente-se · Tópico 5/10 — dizer profissão: observe a imagem e escolha a frase que representa “Eu sou professor.”
- id 34162 · q142 · choice · Unidade 2/10 — Apresente-se · Tópico 5/10 — dizer profissão: escolha como dizer “Eu sou professor.” em Alemão
- id 34180 · q160 · context_choice · Unidade 2/10 — Apresente-se · Tópico 6/10 — dizer estudo: situação guiada — você precisa comunicar “Eu sou professor.” no tema “dizer estudo”. Escolha a fala correta em Alemão.

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 8 · 2x
Frase: `ouça e monte em ordem natural — “Eu moro em São Paulo.”`
- id 34169 · q149 · listen_build · Unidade 2/10 — Apresente-se · Tópico 5/10 — dizer profissão: ouça e monte em ordem natural — “Eu moro em São Paulo.”
- id 34178 · q158 · listen_build · Unidade 2/10 — Apresente-se · Tópico 6/10 — dizer estudo: ouça e monte em ordem natural — “Eu moro em São Paulo.”

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 8 · 2x
Frase: `monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala`
- id 34170 · q150 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34179 · q159 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### BLOCK · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 9 · 4x
Frase: `Wie heißt du?`
- id 34181 · q161 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 7/10 — perguntar nome: ouça o áudio e identifique “Como você se chama?”
- id 34188 · q168 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34197 · q177 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34200 · q180 · listen_build · Unidade 2/10 — Apresente-se · Tópico 8/10 — perguntar origem: ouça e monte em ordem natural — “Como você se chama?”

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 9 · 3x
Frase: `Woher kommst du?`
- id 34182 · q162 · choice · Unidade 2/10 — Apresente-se · Tópico 7/10 — perguntar nome: escolha como dizer “De onde você é?” em Alemão
- id 34191 · q171 · context_choice · Unidade 2/10 — Apresente-se · Tópico 8/10 — perguntar origem: situação guiada — você precisa comunicar “De onde você é?” no tema “perguntar origem”. Escolha a fala correta em Alemão.
- id 34197 · q177 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### BLOCK · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 9 · 5x
Frase: `Ich bin Lehrer.`
- id 34188 · q168 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34189 · q169 · listen_build · Unidade 2/10 — Apresente-se · Tópico 7/10 — perguntar nome: ouça e monte em ordem natural — “Eu sou professor.”
- id 34196 · q176 · listen_match · Unidade 2/10 — Apresente-se · Revisão guiada: tópico 8 bloco 6 — ouça cada áudio em Alemão e selecione a tradução em português
- id 34197 · q177 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34198 · q178 · context_choice · Unidade 2/10 — Apresente-se · Tópico 8/10 — perguntar origem: situação guiada — você precisa comunicar “Eu sou professor.” no tema “perguntar origem”. Escolha a fala correta em Alemão.

### BLOCK · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 9 · 4x
Frase: `Ich lerne Deutsch.`
- id 34188 · q168 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34190 · q170 · context_choice · Unidade 2/10 — Apresente-se · Tópico 7/10 — perguntar nome: situação guiada — você precisa comunicar “Eu estudo alemão.” no tema “perguntar nome”. Escolha a fala correta em Alemão.
- id 34197 · q177 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34199 · q179 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 8/10 — perguntar origem: ouça o áudio e identifique “Eu estudo alemão.”

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 9 · 2x
Frase: `monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala`
- id 34188 · q168 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34197 · q177 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 10 · 3x
Frase: `Ich mag Musik.`
- id 34201 · q181 · choice · Unidade 2/10 — Apresente-se · Tópico 9/10 — falar hobby: escolha como dizer “Eu gosto de música.” em Alemão
- id 34209 · q189 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34220 · q200 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 10 · 3x
Frase: `Freut mich.`
- id 34202 · q182 · build · Unidade 2/10 — Apresente-se · Tópico 9/10 — falar hobby: monte a frase em ordem natural para dizer “Prazer em conhecer você.”
- id 34211 · q191 · image_choice · Unidade 2/10 — Apresente-se · Tópico 10/10 — encerrar apresentação: observe a imagem e escolha a frase que representa “Prazer em conhecer você.”
- id 34220 · q200 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 10 · 3x
Frase: `Wie heißt du?`
- id 34209 · q189 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34218 · q198 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 10/10 — encerrar apresentação: ouça o áudio e identifique “Como você se chama?”
- id 34220 · q200 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### BLOCK · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 10 · 4x
Frase: `Woher kommst du?`
- id 34209 · q189 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34210 · q190 · listen_choice · Unidade 2/10 — Apresente-se · Tópico 9/10 — falar hobby: ouça o áudio e identifique “De onde você é?”
- id 34219 · q199 · listen_build · Unidade 2/10 — Apresente-se · Tópico 10/10 — encerrar apresentação: ouça e monte em ordem natural — “De onde você é?”
- id 34220 · q200 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 10 · 2x
Frase: `entenda “Ich lerne Deutsch.” — qual é o significado em português?`
- id 34208 · q188 · choice · Unidade 2/10 — Apresente-se · Tópico 9/10 — falar hobby: entenda “Ich lerne Deutsch.” — qual é o significado em português?
- id 34217 · q197 · choice · Unidade 2/10 — Apresente-se · Tópico 10/10 — encerrar apresentação: entenda “Ich lerne Deutsch.” — qual é o significado em português?

### REVISE · SESSION_IDENTICAL_PROMPT_CORE · de sessão 10 · 2x
Frase: `monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala`
- id 34209 · q189 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala
- id 34220 · q200 · sequence_dialogue · Unidade 2/10 — Apresente-se · Revisão guiada: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 11 · 3x
Frase: `Ich reise nach Berlin.`
- id 34221 · q201 · choice · Unidade 3/10 — Converse sobre viagem · Tópico 1/10 — destino: escolha como dizer “Eu viajo para a cidade.” em Alemão
- id 34237 · q217 · match · Unidade 3/10 — Converse sobre viagem · Revisão guiada: tópico 2 bloco 7 — relacione cada frase ao significado em português
- id 34240 · q220 · context_choice · Unidade 3/10 — Converse sobre viagem · Tópico 2/10 — passagem: situação guiada — você precisa comunicar “Eu viajo para a cidade.” no tema “passagem”. Escolha a fala correta em Alemão.

### REVISE · SESSION_REPEATED_ANSWER_PHRASE_GT2 · de sessão 11 · 3x
Frase: `Ich brauche ein Ticket.`
- id 34222 · q202 · listen_choice · Unidade 3/10 — Converse sobre viagem · Tópico 1/10 — destino: ouça o áudio e identifique “Eu preciso de uma passagem.”
- id 34231 · q211 · listen_choice · Unidade 3/10 — Converse sobre viagem · Tópico 2/10 — passagem: ouça o áudio e identifique “Eu preciso de uma passagem.”
- id 34237 · q217 · match · Unidade 3/10 — Converse sobre viagem · Revisão guiada: tópico 2 bloco 7 — relacione cada frase ao significado em português
