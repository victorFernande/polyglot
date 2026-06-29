# 🌍 Polyglot — Projeto de Aquisição de Línguas

> **Meta:** Em 1 mês, compreender material básico em cada idioma.  
> **Método:** Ondas focadas + input comprehensível + SRS + âncoras culturais.  
> **Gamificação:** Fases de "Boss", streaks, e recompensas de imersão.

---

## 🎮 Sistema de Ondas (Wave System)

Cada idioma é uma **temporada** de 8 semanas. Você joga uma de cada vez.

| Onda | Idioma | Duração | Boss Final | Âncora Cultural |
|------|--------|---------|------------|-----------------|
| 🌊 1 | 🇩🇪 Alemão | 8 semanas | Entender "Du Hast" sem legenda | **Rammstein** |
| 🌊 2 | 🇫🇷 Francês | 8 semanas | Entender uma cena de *Amélie* | Música francesa |
| 🌊 3 | 🇷🇺 Russo | 8 semanas | Ler um tweet em cirílico | Música russa |
| 🌊 4 | 🇯🇵 Japonês | 8 semanas | Entender um anime sem legenda | Anime/manga |

**Regra de ouro:** Não pular ondas. Terminar uma para desbloquear a próxima.

---

## 🏆 Fases de Cada Onda (8 Semanas)

```
Semana 1-2: FASE 1 — "O Despertar" (Alfabeto + Sons básicos)
Semana 3-4: FASE 2 — "Primeiras Palavras" (Vocabulário core 100)
Semana 5-6: FASE 3 — "Estruturas" (Gramática básica + frases)
Semana 7-8: FASE 4 — "O Boss" (Imersão com âncora cultural)
```

### Checklist de Desbloqueio por Fase

- [ ] FASE 1: Alfabeto/sons → Teste de reconhecimento 90%
- [ ] FASE 2: 100 palavras → Flashcards SRS com 80% acerto
- [ ] FASE 3: 50 frases úteis → Consegue pedir comida/direções/apresentar-se
- [ ] FASE 4: Boss → Compreende material autêntico da âncora

---

## 📊 Dashboard de Progresso

Veja seu status em [`shared/progress-tracker.md`](shared/progress-tracker.md).

| Métrica | Alvo Diário | Streak Atual |
|---------|-------------|--------------|
| ⏱️ Tempo de estudo | 30-45 min | — |
| 🎵 Input (música/podcast) | 15 min | — |
| 🃏 SRS (Anki/revisão) | 10 min | — |
| 🗣️ Produção (falar/escrever) | 5 min | — |

---

## 🗂️ Estrutura do Repo

```
polyglot/
├── german/          # 🇩🇪 Onda 1 — Rammstein Edition
│   ├── alphabet/
│   ├── grammar/
│   ├── vocabulary/
│   ├── immersion/rammstein/   # 🎸 Letras, traduções, análise
│   └── progress/
├── french/          # 🇫🇷 Onda 2 — Chanson/Cinema
│   ├── alphabet/
│   ├── grammar/
│   ├── vocabulary/
│   ├── immersion/chanson/
│   └── progress/
├── russian/         # 🇷🇺 Onda 3 — Cirílico/Música
│   ├── alphabet/
│   ├── grammar/
│   ├── vocabulary/
│   ├── immersion/music/
│   └── progress/
├── japanese/        # 🇯🇵 Onda 4 — Anime/Manga
│   ├── alphabet/
│   ├── grammar/
│   ├── vocabulary/
│   ├── immersion/anime/
│   └── progress/
├── shared/
│   ├── anki-decks/      # Decks gerados por onda
│   ├── methodology/     # Como aprender idiomas (ciência)
│   ├── templates/       # Templates de plano de estudo
│   └── tools/           # Scripts auxiliares
├── waves/               # Planos detalhados de cada onda
└── logs/                # Diário de estudo (semanal)
```

---

## 🎸 Onda 1: Alemão — Rammstein Edition

**Âncora:** Rammstein (industrial metal alemão)  
**Por quê:** Você já escuta. Letras são poéticas, repetitivas, e Till Lindemann articula bem — ótimo para fonética.  
**Músicas por fase:**

- FASE 1: "Sonne" (repetitiva, ritmo claro)
- FASE 2: "Du Hast" (frases curtas, refrão icônico)
- FASE 3: "Ich Will" (verbos de ação, estrutura simples)
- FASE 4: "Deutschland", "Amerika", "Mein Herz Brennt" (complexas, poéticas)

**Boss Final:** Ouvir "Du Hast" ao vivo e entender 80% sem legenda.

→ [Começar Onda 1](waves/wave-01-german.md)

---

## 🧠 Metodologia

Baseada em evidências:
- **70% Input Compreensível** (Krashen): Ouvir/ler material um pouco acima do nível
- **20% SRS Ativo** (Spaced Repetition): Anki para vocabulário fixar
- **10% Produção Forçada**: Falar sozinho, escrever frases, shadowing

Leia mais em [`shared/methodology/`](shared/methodology/).

---

## 🚀 Como Usar Este Projeto

1. **Clone** o repo (ou use local)
2. **Leia** a onda atual em `waves/`
3. **Siga** o plano diário (30-45 min)
4. **Registre** progresso em `logs/` e no Kanban
5. **Complete** o Boss para desbloquear a próxima onda

---

*"Sprache ist der Schlüssel zur Welt."* (A língua é a chave para o mundo.)
