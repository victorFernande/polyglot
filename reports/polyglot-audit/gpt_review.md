## 1. Verdict geral: **BLOCK**

O lote não deve ir para produção para iniciante absoluto/criança de 5 anos.

Motivo: há **454 exercícios BLOCK / high severity** em 5.000, incluindo **450 `sequence_dialogue` bloqueados** por falta de ordem explícita e fluxo ambíguo, além de **4 casos de `visible_answer_leak`**. Há também **338 exercícios REVISE / medium** por ícones genéricos inadequados em `image_choice`.

Distribuição:

- Total: **5.000**
- PASS: **4.208**
- REVISE: **338**
- BLOCK: **454**

Por severidade:

- High: **454**
- Medium: **338**
- None: **4.208**

O problema é sistemático, não pontual.

---

## 2. Principais gaps por severidade

### High — bloquear

#### A. `sequence_dialogue` sem ordem ensinada — 450 casos

Códigos:

- `sequence_missing_explicit_order`: **450**
- `sequence_ambiguous_dialogue_flow`: **450**

Problema pedagógico: o enunciado diz apenas:

> “monte uma sequência curta; ordene as frases pelo fluxo lógico da situação”

Isso é insuficiente para iniciante absoluto. A criança precisa saber **qual é a lógica esperada**: quem fala primeiro, qual situação está acontecendo, se é começo/meio/fim do atendimento, se há pedido, agradecimento, pagamento ou despedida.

Nos exemplos, a sequência correta é tratada como óbvia, mas não é ensinada no prompt.

Exemplo bloqueado:

> Tiles: “Ich möchte einen Kaffee.” / “Ein Wasser, bitte.” / “Ich möchte ein Brot.” / “Hallo”  
> Resposta esperada: “Hallo” → “Ich möchte einen Kaffee.” → “Ein Wasser, bitte.” → “Ich möchte ein Brot.”

Para uma criança iniciante, isso vira chute. As três frases de pedido poderiam aparecer em várias ordens sem violar claramente o “fluxo lógico”.

Outro exemplo ainda mais problemático:

> Resposta esperada: “Die Rechnung, bitte.” → “Ja, das stimmt.” → “Auf Wiedersehen.” → “Hallo”

Essa ordem parece misturar final de interação com novo início. Sem contexto explícito, não há base pedagógica para exigir essa ordem.

#### B. `visible_answer_leak` — 4 casos

Tipo afetado:

- `choice:BLOCK`: **4**

O resumo indica 4 casos de vazamento de resposta visível. Isso é bloqueante porque transforma o exercício em reconhecimento mecânico da resposta exposta, não em aprendizagem.

---

### Medium — revisar

#### C. `image_choice` com ícone genérico `book` — 338 casos

Código:

- `generic_book_icon`: **338**

Problema: o exercício pede “observe a imagem”, mas algumas alternativas usam ícone genérico de livro para conceitos que não são livro, como:

- “Sim, está certo.”
- “Até logo.”
- “Por favor.”
- “Obrigado.”

Isso enfraquece o apoio visual. Para criança de 5 anos, a imagem precisa ser semanticamente útil. Um livro genérico não ajuda a distinguir “obrigado”, “por favor”, “até logo” ou “sim, está certo”.

Exemplo:

> “Até logo.” com `icon_key: book`

Se a imagem não representa a frase, o exercício deixa de ser `image_choice` real e vira escolha por texto/tradução.

---

## 3. O que deve ser corrigido primeiro

### Prioridade 1 — bloquear e regenerar os 450 `sequence_dialogue`

Esses exercícios são pedagogicamente fracos no formato atual. Não basta ajustar uma frase genérica no enunciado; é necessário redesenhar a tarefa.

Correção obrigatória:

- explicar a situação;
- indicar quem fala;
- indicar a ordem esperada;
- evitar sequências com múltiplas ordens plausíveis;
- evitar misturar início e fim de conversa sem contexto;
- reduzir carga cognitiva para iniciante absoluto.

Exemplo de direção aceitável:

> “No café, primeiro diga olá. Depois peça um café. Depois peça água. Por fim, peça pão. Coloque as frases nessa ordem.”

Isso dá contexto e ensina a ordem. Porém, deve-se tomar cuidado para não virar answer leak textual direto se a tarefa for apenas ordenar frases idênticas. Para criança iniciante, pode ser aceitável em fase de scaffolding, mas não como avaliação forte.

Melhor ainda: transformar em diálogo com papéis e marcadores:

> “Cliente no café: 1) cumprimenta, 2) pede café, 3) pede água, 4) agradece.”

Depois o aluno ordena as frases correspondentes.

### Prioridade 2 — corrigir os 4 `visible_answer_leak`

Qualquer exercício com resposta visível no prompt, na imagem, no áudio transcrito, no `label_pt`, em metadados exibidos ou em alternativa destacada deve ser removido/regenerado.

### Prioridade 3 — revisar os 338 `image_choice` com `book`

Substituir `book` por ícones semanticamente alinhados ou mudar o tipo de exercício se não houver imagem adequada.

---

## 4. Regras concretas para regenerar/corrigir todos os exercícios

### Regras para `sequence_dialogue`

1. **Nunca usar apenas “ordene pelo fluxo lógico da situação”.**  
   Esse enunciado é insuficiente para iniciante absoluto.

2. **Sempre declarar a situação comunicativa.**  
   Exemplo: “Você está no café e vai fazer um pedido.”

3. **Sempre declarar a ordem funcional esperada.**  
   Exemplo:
   - primeiro cumprimentar;
   - depois pedir;
   - depois agradecer;
   - por fim despedir-se.

4. **Sempre indicar papéis quando houver diálogo.**  
   Exemplo:
   - Cliente fala;
   - Atendente responde;
   - Cliente agradece.

5. **Não misturar atos comunicativos incompatíveis sem contexto.**  
   Exemplo problemático do resumo: despedida seguida de “Hallo” sem explicar que começa uma nova conversa.

6. **Evitar múltiplas frases do mesmo tipo sem critério claro.**  
   Exemplo: café, água e pão podem ser pedidos em várias ordens. Se a ordem importa, o prompt precisa dizer por quê.

7. **Para criança de 5 anos, usar sequências curtas e previsíveis.**  
   Recomendação: 3 passos antes de 4, especialmente nas primeiras unidades.

8. **Introduzir vocabulário antes de exigir ordenação.**  
   Sequência é exercício complexo. As frases devem ter aparecido antes em atividades mais simples: escuta, imagem, escolha, match ou repetição.

9. **Usar marcadores visuais ou funcionais.**  
   Exemplo:
   - 👋 Olá
   - ☕ Pedido
   - 🙏 Obrigado
   - 👋 Tchau

10. **Não aceitar sequência cuja resposta dependa de “bom senso adulto”.**  
    Para iniciante absoluto, a lógica deve estar ensinada no próprio exercício ou em scaffold anterior.

---

### Regras para `image_choice`

1. **Se o prompt diz “observe a imagem”, a imagem precisa carregar informação útil.**

2. **Não usar `book` como fallback para atos comunicativos.**  
   Conceitos como “obrigado”, “por favor”, “até logo”, “sim, está certo” precisam de imagem própria ou outro tipo de exercício.

3. **Ícone deve diferenciar alternativas.**  
   Se duas alternativas têm o mesmo ícone `receipt`, por exemplo, o aluno não consegue usar a imagem como pista confiável.

4. **Não usar imagem genérica para frase abstrata sem contexto.**  
   Para “Sim, está certo”, melhor usar uma cena de confirmação, checkmark, atendente confirmando pedido etc.

5. **Se não houver imagem adequada, converter para outro tipo.**  
   Exemplo: `choice`, `listen_choice`, `context_choice` ou `match`.

---

### Regras para enunciados

1. **Dar contexto suficiente sem entregar a resposta.**

2. **Evitar enunciado que repete exatamente a resposta-alvo junto com a alternativa correta.**

3. **Para iniciante absoluto, usar linguagem simples em PT-BR.**

4. **Uma tarefa por vez.**  
   Não misturar: ordenar, traduzir, inferir contexto e aprender vocabulário novo no mesmo exercício.

5. **Não exigir inferência pragmática avançada.**  
   “Fluxo lógico” sem explicação é inferência pragmática, não aprendizagem guiada.

---

### Regras de scaffold de vocabulário

1. **Novo vocabulário deve aparecer primeiro em exercícios receptivos simples.**
   Ordem recomendada:
   - imagem + palavra/frase;
   - escuta + escolha;
   - match;
   - escolha com contexto;
   - build;
   - sequência curta.

2. **Sequência de diálogo deve vir depois de exposição suficiente.**

3. **Não introduzir várias frases novas dentro de uma sequência.**

4. **Manter alta previsibilidade nas primeiras unidades.**

---

## 5. Riscos de answer leak e como evitar

O resumo aponta **4 casos de `visible_answer_leak`**. Mesmo sem exemplos detalhados desses 4 casos, o risco é claro: o exercício pode mostrar a resposta antes da escolha.

### Riscos típicos a bloquear

1. **Prompt contém exatamente a resposta em língua-alvo.**  
   Exemplo de risco: pedir “escolha ‘Ich möchte einen Kaffee’” e ter essa mesma frase como alternativa.

2. **`label_pt` ou texto auxiliar entrega a alternativa correta de forma óbvia.**

3. **Imagem contém texto da resposta.**

4. **Áudio vem acompanhado de transcrição visível quando a tarefa é escuta.**

5. **Metadados visíveis incluem `answer`, `value`, `display_text` destacado ou ordem correta.**

6. **Enunciado de sequência lista os atos na mesma ordem e com correspondência 1:1 direta com os tiles.**  
   Isso pode ser scaffold válido em treino inicial, mas não deve ser tratado como avaliação independente.

### Como evitar

- Separar campos internos de campos renderizados.
- Garantir que `answer`, `value`, `correct`, `index`, `solution` nunca apareçam na UI.
- Em `listen_*`, esconder transcrição durante a resposta.
- Em `image_choice`, remover texto da imagem se ele for a resposta.
- Em `sequence_dialogue`, dar ordem funcional, não necessariamente repetir literalmente as frases na ordem correta.
- Rodar teste automático de string match entre prompt visível e resposta correta em língua-alvo.

---

## 6. Regressões/testes obrigatórios

Lista curta de testes que devem existir antes de aprovar novo lote:

1. **Teste de sequência com ordem explícita**
   - Todo `sequence_dialogue` deve conter instrução de ordem funcional clara.
   - Bloquear se o prompt tiver apenas “fluxo lógico”.

2. **Teste de ambiguidade em sequência**
   - Bloquear se houver múltiplas frases do mesmo ato comunicativo sem critério de ordenação.
   - Exemplo: vários pedidos independentes sem “primeiro/depois/por fim”.

3. **Teste de papéis de diálogo**
   - Se for diálogo, exigir indicação de quem fala ou da situação.
   - Exemplo: cliente/atendente.

4. **Teste de início/fim de conversa**
   - Bloquear sequências que colocam despedida antes de saudação ou misturam “Auf Wiedersehen” e “Hallo” sem contexto explícito.

5. **Teste de `visible_answer_leak`**
   - Comparar resposta correta com prompt visível, labels, imagens com texto, transcrições e campos renderizados.
   - Qualquer vazamento deve ser `BLOCK`.

6. **Teste de ícone genérico**
   - Bloquear ou revisar `image_choice` com `icon_key: book` para conceitos que não são livro.
   - O resumo já mostra esse padrão em 338 casos.

7. **Teste de alinhamento imagem-conceito**
   - Se o tipo é `image_choice`, a imagem precisa representar semanticamente a frase.
   - Caso contrário, converter tipo ou revisar asset.

8. **Teste de scaffold**
   - Verificar se frases usadas em `sequence_dialogue` já apareceram antes em exercícios mais simples na mesma progressão.

9. **Teste por idioma**
   - Como os problemas aparecem distribuídos em de/fr/ru/jp/en, validar a regra em todos os idiomas, não só em alemão.

10. **Teste de severidade**
   - `sequence_missing_explicit_order`, `sequence_ambiguous_dialogue_flow` e `visible_answer_leak` devem permanecer como bloqueantes.
   - `generic_book_icon` deve permanecer no mínimo como revisão obrigatória.

---

Conclusão: **BLOCK geral**. Os 450 `sequence_dialogue` precisam ser redesenhados com contexto e ordem explícita; os 4 vazamentos precisam ser removidos; os 338 `image_choice` com `book` precisam de assets semânticos ou mudança de tipo. Sem isso, o lote permite chute, reduz scaffolding e falha para iniciante absoluto de 5 anos.