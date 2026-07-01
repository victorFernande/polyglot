## Veredito
**Aprovado com ressalvas.** A base está funcional, mas três padrões recorrentes precisam de correção antes de seguir em frente.

## Problemas e correções

1. **450 `sequence_dialogue` sem ordem explícita**
   - **Problema:** O enunciado não deixa claro que o aluno deve ordenar o diálogo.
   - **Correção:** Adicione instrução direta, ex: *"Coloque as frases em ordem para formar o diálogo"* ou *"Organize o diálogo na sequência correta"*. Verifique também se a ordem esperada está coerente com as falas.

2. **338 `image_choice` com ícone book genérico**
   - **Problema:** Uso de placeholder prejudica a clareza e a experiência; o aluno pode não entender o que está sendo perguntado.
   - **Correção:** Substitua pelo ícone/ilustração específico do item testado (objeto, ação, cenário) ou, quando não houver imagem adequada, reformule para `text_choice`.

3. **4 answer leaks**
   - **Problema:** A resposta correta vaza no enunciado, imagem ou alternativas.
   - **Correção:** Revise manualmente os 4 itens, remova a pista e valide se a distração ainda faz sentido. Escalone a causa (template, erro de geração) para evitar novos vazamentos.

## Recomendação
Priorize os **answer leaks** (impacto direto na validade), depois os **image_choice** genéricos e, por fim, os **sequence_dialogue** sem instrução. Após correções, faça amostragem de ~5% para validar.