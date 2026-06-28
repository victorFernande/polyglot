# Polyglot — Exercícios Longos e Persistência Completa Implementation Plan

> **For Hermes:** Implementar task-by-task com TDD pragmático: testes de API primeiro, depois frontend e validação real em Docker/HTTPS.

**Goal:** transformar a página de exercícios de protótipo local em um sistema real com lições longas, estado persistente, XP/streak/conquistas e dashboard alimentado pela API.

**Architecture:** o backend FastAPI/SQLAlchemy será a fonte de verdade. O frontend React consumirá endpoints `/api/*` pelo mesmo domínio HTTPS via Tailscale Serve, evitando `localhost` no navegador do usuário. A persistência ficará no volume Docker `polyglot-data` via SQLite, com migração idempotente simples para tabelas novas.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, Pydantic, React 18, Zustand, Vite, Tailwind, Docker Compose, Tailscale Serve.

---

## Contexto atual

- Repo: `/home/victor/workspace/polyglot`
- URL desejada: `https://cortexai.tailb76d32.ts.net:3030/`
- Backend: container `polyglot-backend`, porta host `8095`, DB `sqlite:///./data/polyglot.db`
- Frontend: container `polyglot-frontend`, porta local `127.0.0.1:3031`, publicado por Tailscale em HTTPS 3030
- Problema atual: exercícios são dados estáticos no React, curtos e sem persistência; dashboard ainda usa mock inicial.
- Requisito do usuário: tornar exercícios mais longos, persistir estado real e adicionar tudo ao Kanban, executando até conclusão.

---

## Fase 1 — Persistência e contrato backend

### Task 1: Criar modelos de exercícios persistentes

**Objective:** adicionar tabelas para lições, itens, sessões e respostas.

**Files:**
- Modify: `docker/backend/models.py`
- Modify: `docker/backend/schemas.py`
- Test: criar/usar `docker/backend/test_exercises_api.py`

**Modelo esperado:**
- `ExerciseLesson`: idioma, slug, título, descrição, ordem, xp base, ativo
- `ExerciseItem`: tipo (`choice`, `build`, `match`), prompt, answer JSON, options JSON, tiles JSON, pairs JSON, hint, explanation, order_index, xp_reward
- `ExerciseSession`: user_id, lesson_id, status, hearts_start, hearts_left, current_index, correct_count, total_count, xp_earned, started_at, completed_at
- `ExerciseAnswer`: session_id, item_id, payload JSON, is_correct, xp_earned, answered_at

**Validation:**
- `POST /users/1/bootstrap` cria Victor se não existir e inicializa ondas/lições.
- `GET /exercise-lessons?user_id=1` retorna 4 idiomas com lições longas.
- `POST /exercise-lessons/{lesson_id}/sessions` inicia uma sessão.
- `POST /exercise-sessions/{session_id}/answer` persiste resposta e atualiza sessão.
- `POST /exercise-sessions/{session_id}/complete` fecha sessão, aplica XP/streak/vocabulário/frases.

---

### Task 2: Seed de conteúdo longo por idioma

**Objective:** aumentar o tamanho das lições iniciais para parecer estudo real, não demo.

**Files:**
- Modify: `docker/backend/services.py`

**Conteúdo mínimo:**
- 4 idiomas (`de`, `fr`, `ru`, `jp`)
- Pelo menos 12 exercícios por idioma
- Mistura de tipos:
  - múltipla escolha
  - montar frase
  - matching
- Conteúdo com progressão de dificuldade:
  - reconhecimento básico
  - vocabulário essencial
  - frases de sobrevivência
  - mini-revisão
- Cada item com dica e explicação.

**Validation:**
- Conferir que cada idioma possui >= 12 itens.
- Conferir que cada lição tem tipos variados.

---

### Task 3: Implementar cálculo de XP/streak/conquistas para exercício

**Objective:** ao concluir lição, atualizar usuário, logs, wave por idioma, vocabulário/frases e conquistas.

**Files:**
- Modify: `docker/backend/services.py`
- Modify: `docker/backend/main.py`

**Rules:**
- Resposta correta: soma XP do item.
- Resposta errada: tira coração; não dá XP do item.
- Concluir sessão: cria `StudyLog(activity_type='srs')` com duração aproximada e `xp_earned` real.
- Atualiza `User.total_xp` só no fechamento da sessão para evitar duplicação.
- Atualiza streak via `GamificationService.check_streak`.
- Atualiza `Wave.vocabulary_count` e `phrases_count` para o idioma.
- Idempotência: completar sessão já completada retorna o mesmo resumo sem duplicar XP.

**Validation:**
- Completar sessão aumenta XP uma vez.
- Completar de novo não duplica XP.
- Dashboard mostra XP/logs reais.

---

## Fase 2 — Frontend conectado e exercícios longos

### Task 4: Criar cliente API e bootstrap do usuário

**Objective:** trocar mocks por chamadas reais à API.

**Files:**
- Create: `docker/frontend/src/lib/api.js`
- Modify: `docker/frontend/src/pages/Dashboard.jsx`
- Modify: `docker/frontend/src/pages/Waves.jsx`
- Modify: `docker/frontend/src/pages/Profile.jsx`
- Modify: `docker/frontend/src/pages/Achievements.jsx`
- Modify: `docker/frontend/src/pages/Leaderboard.jsx`

**Approach:**
- `apiFetch(path, options)` usa `/api` por padrão.
- `bootstrapUser()` chama `/api/users/bootstrap` e guarda user id em `localStorage`.
- Dashboard chama `/api/users/{id}/dashboard`.
- Leaderboard chama `/api/leaderboard`.

**Validation:**
- Recarregar página preserva progresso.
- Dashboard não usa dados mockados.

---

### Task 5: Refatorar Exercises.jsx para sessão persistente

**Objective:** transformar a UI atual em uma lição longa persistida no backend.

**Files:**
- Modify: `docker/frontend/src/pages/Exercises.jsx`

**Behavior:**
- Carregar lições por idioma da API.
- Mostrar progresso real: questão atual/total.
- Iniciar sessão ao escolher idioma/lição.
- Ao verificar resposta, chamar backend e persistir.
- Ao finalizar, chamar endpoint de complete e atualizar XP/streak/logs.
- Permitir retomar sessão `in_progress`.
- Mostrar resumo: acertos, total, XP ganho, corações restantes.

**Validation:**
- Fazer exercício, recarregar e ver progresso persistido.
- Finalizar lição e ver XP no dashboard.

---

## Fase 3 — Publicação HTTPS e integração operacional

### Task 6: Configurar proxy `/api` no mesmo HTTPS 3030

**Objective:** evitar mixed content e `localhost` no navegador.

**Approach:**
- Tailscale Serve deve publicar:
  - `/` -> `http://127.0.0.1:3031`
  - `/api/` -> `http://127.0.0.1:8095/`
- Frontend usa `/api` relativo.

**Validation:**
- `curl -k https://cortexai.tailb76d32.ts.net:3030/api/health` retorna health do backend.
- `curl -k https://cortexai.tailb76d32.ts.net:3030/` retorna app.

---

### Task 7: Testes, build, deploy e commit

**Objective:** validar tudo no ambiente real.

**Commands:**
- Backend tests: `python -m pytest -q` dentro de `docker/backend` se pytest disponível; se não, usar script `TestClient`/curl.
- Build frontend: `docker compose build frontend backend`
- Deploy: `docker compose up -d`
- Health:
  - `curl -k https://cortexai.tailb76d32.ts.net:3030/api/health`
  - `curl -k https://cortexai.tailb76d32.ts.net:3030/exercises`
- Git:
  - `git status --short`
  - `git add ...`
  - `git commit -m "feat: persist exercise sessions"`
  - `git push origin main`

---

## Kanban esperado

Cards a criar no board `polyglot`:

1. Backend: modelos e endpoints persistentes de exercícios
2. Conteúdo: lições longas DE/FR/RU/JP com seed idempotente
3. Gamificação: XP/streak/logs/conquistas a partir de exercícios
4. Frontend: API client + bootstrap + remover dashboard mock
5. Frontend: exercícios longos com sessões persistentes
6. Infra: HTTPS `/api` no Tailscale Serve
7. QA: testes, build, deploy, commit e push

---

## Riscos e mitigação

- **Sem Alembic:** usar migração idempotente com `Base.metadata.create_all` e seeds que não duplicam por slug.
- **Mixed content HTTPS -> HTTP:** resolver via `/api` no mesmo domínio HTTPS.
- **Duplicação de XP:** completar sessão deve ser idempotente.
- **DB já existente:** nunca dropar tabela; criar apenas novas tabelas e seeds ausentes.
- **Vite preview sem proxy:** usar Tailscale Serve path routing para API.

---

## Definition of Done

- Exercícios têm >= 12 itens por idioma.
- Estado persiste após refresh.
- XP/streak/logs aparecem no dashboard real.
- Leaderboard usa backend.
- `/api/health` funciona via HTTPS 3030.
- Containers healthy.
- Código commitado e pushado para `main`.
