export const exercisesQaChangeLog = [
  {
    id: '2026-06-30-1758-qa-change-menu',
    timestamp: '30/06 18:00',
    title: 'Menu de histórico QA no Exercícios QA',
    approved: true,
    approvalPhrase: 'qa aprovado 30/06 18:00',
    summary: 'Adiciona no topo da página Exercícios QA um menu clicável com o histórico de mudanças de QA registradas.',
    diffs: [
      '/exercises-qa mostra a data/hora do histórico de QA no topo.',
      'Ao clicar no menu, a página lista os diffs de QA registrados.',
      'O texto de aprovação esperado aparece em cada entrada, por exemplo “qa aprovado 30/06 18:00”.',
      'A mudança fica apenas em ExercisesQA.jsx; produção /exercises não recebe este menu por ser chrome de QA.',
    ],
  },
  {
    id: '2026-06-30-1911-qa-session-integrity-strip',
    timestamp: '30/06 19:11',
    title: 'Faixa QA de integridade da sessão real',
    approved: true,
    approvalPhrase: 'qa aprovado 30/06 19:11',
    summary: 'Adiciona em /exercises-qa uma faixa visual QA-only com metadados da sessão backend para validar XP/progresso, limite de 20 itens e variedade real da sessão antes de qualquer promoção.',
    diffs: [
      '/exercises-qa passa a mostrar session.id, item.type, total_count e XP real da sessão backend.',
      'A página exibe QA BLOCKER quando session.total_count ultrapassa 20 itens.',
      'Variedade mostra contagem por item.type usando apenas session.items reais vindos do backend.',
      'Nenhum treino local, Questão extra, painel frontend-only ou atividade sem XP/progresso é criado.',
      'docker/frontend/src/pages/Exercises.jsx e produção /exercises permanecem sem alteração neste ciclo.',
    ],
  },
  {
    id: '2026-06-30-2002-qa-approval-phrase-format',
    timestamp: '30/06 20:02',
    title: 'Formato explícito da frase de aprovação QA',
    approved: true,
    approvalPhrase: 'QA aprovado 30/06 20:02',
    summary: 'Clarifica no banner de /exercises-qa que a aprovação precisa usar exatamente o formato “QA aprovado DD/MM HH:MM” da entrada de QA antes de qualquer promoção para produção.',
    diffs: [
      '/exercises-qa passa a mostrar o formato completo da frase de aprovação no banner de staging.',
      'O menu de histórico QA registra a frase exata “QA aprovado 30/06 20:02” para esta alteração visível.',
      'A mudança é apenas em QA/changelog; não cria treino local, exercício extra, painel frontend-only ou atividade sem XP/progresso.',
      'docker/frontend/src/pages/Exercises.jsx e produção /exercises permanecem sem menus ou banners de QA.',
    ],
  },
  {
    id: '2026-06-30-2011-qa-collapsed-approval-phrase',
    timestamp: '30/06 20:11',
    title: 'Frase de aprovação visível no menu fechado',
    approved: true,
    approvalPhrase: 'QA aprovado 30/06 20:11',
    summary: 'Mostra a frase exata de aprovação da entrada de QA mais nova diretamente no menu fechado de /exercises-qa, sem exigir que Victor abra os detalhes para copiar a aprovação correta.',
    diffs: [
      '/exercises-qa passa a mostrar “Próxima aprovação: QA aprovado 30/06 20:11” no estado fechado do menu de histórico QA.',
      'A frase continua vinculada a latestExercisesQaChange(), então o menu fechado acompanha a entrada de QA mais nova.',
      'A mudança é apenas em ExercisesQA.jsx e no changelog QA; não cria treino local, exercício extra, painel frontend-only ou atividade sem XP/progresso.',
      'docker/frontend/src/pages/Exercises.jsx e produção /exercises permanecem sem menus ou banners de QA.',
    ],
  },
  {
    id: '2026-06-30-2102-qa-session-item-count-audit',
    timestamp: '30/06 21:02',
    title: 'Auditoria QA de contagem real da sessão',
    approved: true,
    approvalPhrase: 'QA aprovado 30/06 21:02',
    summary: 'Amplia a faixa de integridade em /exercises-qa para comparar session.items reais com total_count e expor current_index durante a validação visual.',
    diffs: [
      '/exercises-qa passa a mostrar “items reais” e “current_index” na faixa Integridade QA da sessão.',
      'A página exibe QA BLOCKER quando session.items.length não bate com session.total_count, evitando promover payload backend truncado ou inconsistente.',
      'A verificação continua usando apenas session.items reais vindos do backend; não cria treino local, Questão extra, painel frontend-only ou atividade sem XP/progresso.',
      'docker/frontend/src/pages/Exercises.jsx e produção /exercises permanecem sem menus ou banners de QA.',
    ],
  },
  {
    id: '2026-06-30-2111-qa-active-item-window-audit',
    timestamp: '30/06 21:11',
    title: 'Auditoria QA da janela ativa da sessão',
    approved: true,
    approvalPhrase: 'QA aprovado 30/06 21:11',
    summary: 'Amplia a faixa de integridade em /exercises-qa para expor item.id e bloquear visualmente sessões cujo current_index não aponta para um item real em session.items.',
    diffs: [
      '/exercises-qa passa a mostrar “item.id” na faixa Integridade QA da sessão para validar o item ativo vindo do backend.',
      'A página exibe QA BLOCKER quando current_index sem item real em session.items, cobrindo janelas ativas esgotadas ou truncadas antes de qualquer promoção.',
      'A checagem continua usando apenas session.items reais; não cria treino local, Questão extra, painel frontend-only ou atividade sem XP/progresso.',
      'docker/frontend/src/pages/Exercises.jsx e produção /exercises permanecem sem menus ou banners de QA.',
    ],
  },
  {
    id: '2026-06-30-2202-qa-finish-window-integrity-state',
    timestamp: '30/06 22:02',
    title: 'Estado QA explícito para janela final da sessão',
    approved: true,
    approvalPhrase: 'QA aprovado 30/06 22:02',
    summary: 'Ajusta a faixa de integridade em /exercises-qa para distinguir item ativo ausente de estado legítimo de fim aguardando conclusão, evitando falso QA BLOCKER após a última resposta.',
    diffs: [
      '/exercises-qa passa a mostrar “janela ativa: fim aguardando conclusão” quando current_index alcança total_count.',
      'O QA BLOCKER “current_index sem item real” agora só aparece quando ainda há exercício em progresso e o índice não aponta para session.items.',
      'A auditoria continua usando apenas session.items reais do backend; não cria treino local, Questão extra, painel frontend-only ou atividade sem XP/progresso.',
      'docker/frontend/src/pages/Exercises.jsx e produção /exercises permanecem sem menus ou banners de QA.',
    ],
  },
  {
    id: '2026-06-30-2302-qa-rendered-item-source-audit',
    timestamp: '30/06 23:02',
    title: 'Auditoria QA da origem do item renderizado',
    approved: true,
    approvalPhrase: 'QA aprovado 30/06 23:02',
    summary: 'Amplia a faixa de integridade em /exercises-qa para bloquear visualmente quando o exercício renderizado vem de fallback local/lesson.items em vez de session.items reais do backend.',
    diffs: [
      '/exercises-qa passa a mostrar item.id renderizado, session item.id e origem do item ativo na faixa Integridade QA da sessão.',
      'A página exibe QA BLOCKER quando o item renderizado não corresponde ao item real em session.items[current_index].',
      'O estado legítimo de fim aguardando conclusão continua sem falso bloqueio de origem do item.',
      'A mudança é apenas QA/changelog; não cria treino local, Questão extra, painel frontend-only ou atividade sem XP/progresso.',
      'docker/frontend/src/pages/Exercises.jsx e produção /exercises permanecem inalterados.',
    ],
  },
  {
    id: '2026-07-01-1002-qa-rendered-item-source-audit-fix',
    timestamp: '01/07 10:02',
    title: 'Correção da auditoria de origem do item renderizado',
    approved: true,
    approvalPhrase: 'QA aprovado 01/07 10:02',
    summary: 'Implementa de fato em /exercises-qa a comparação visual entre item renderizado e item real esperado em session.items, preservando o estado legítimo de snapshot de feedback após responder.',
    diffs: [
      '/exercises-qa passa a mostrar “item.id renderizado”, “session item.id” e “Origem renderizada” na faixa Integridade QA da sessão.',
      'A página exibe QA BLOCKER quando o item renderizado não corresponde ao item real esperado da sessão backend.',
      'O estado de feedback usa session.items[answeredIndex] como item esperado, evitando falso bloqueio quando a correção ainda mostra o item recém-respondido.',
      'A mudança é apenas em ExercisesQA.jsx/testes/changelog QA; não cria treino local, Questão extra, painel frontend-only ou atividade sem XP/progresso.',
      'docker/frontend/src/pages/Exercises.jsx e produção /exercises permanecem inalterados; promoção continua separada e exige aprovação explícita própria.',
    ],
  },
  {
    id: '2026-07-01-1402-qa-suppress-lesson-item-fallback',
    timestamp: '01/07 14:02',
    title: 'Bloqueio visual para fallback de lesson.items',
    approved: false,
    approvalPhrase: 'QA aprovado 01/07 14:02',
    summary: 'Impede que /exercises-qa renderize lesson.items como exercício ativo quando a sessão backend não traz item real em session.items, substituindo o fallback por um painel QA BLOCKER.',
    diffs: [
      '/exercises-qa passa a usar apenas session.items[current_index] como item ativo renderizável; feedback continua usando snapshot do item respondido.',
      'Quando existe lesson.items[current_index] mas falta session.items[current_index], a página mostra painel “QA BLOCKER · fallback de lesson.items suprimido” em vez de renderizar o exercício.',
      'O painel expõe session.id, current_index, total_count e o id do item de lesson.items que foi suprimido para facilitar auditoria do payload backend.',
      'A mudança fica limitada a ExercisesQA.jsx, testes de contrato/integridade QA e changelog QA; docker/frontend/src/pages/Exercises.jsx e produção /exercises permanecem inalterados.',
      'Promoção para produção permanece aguardando aprovação explícita do Victor em uma frase própria.',
    ],
  },
]

export function pendingExercisesQaChanges(entries = exercisesQaChangeLog) {
  return entries.filter((entry) => !entry.approved)
}

export function latestExercisesQaChange(entries = exercisesQaChangeLog) {
  const pending = pendingExercisesQaChanges(entries)
  return pending[pending.length - 1] || null
}
