# linktask — Design

**Date:** 2026-04-16
**Status:** Approved

## O que é

linktask é o sistema central de gestão de projetos da Enjoy. Substitui Notion/ClickUp como ferramenta principal, gerenciando o ciclo completo de projetos via 13 gates do SOP Enjoy — com checklists, aprovações, evidências, RACI e backlog de tarefas dentro de cada fase.

## Decisões

| Pergunta | Decisão |
|---|---|
| Usuários | Todos os envolvidos: gestor, sponsor, stakeholders, time de execução |
| Core | Gates com checklists/aprovações + tarefas dentro de cada fase |
| Scope | Substitui tudo; começa interno (Enjoy), arquitetura multi-tenant para o futuro |
| Frontend | React + TypeScript + Vite |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Integrações | Notion, ClickUp, Google Workspace, OpenAI/Gemini |

## Arquitetura

```
┌─────────────────────────────────────────┐
│           linktask (React + Vite)        │
│  Gates │ Tarefas │ RACI │ Dashboard      │
└──────────────┬──────────────────────────┘
               │ Supabase JS SDK
┌──────────────▼──────────────────────────┐
│              Supabase                    │
│  PostgreSQL  │  Auth  │  Realtime        │
│  RLS (multi-tenant via tenant_id)        │
│  pgvector (embeddings p/ IA)             │
└──────────────┬──────────────────────────┘
               │ Edge Functions (Deno)
┌──────────────▼──────────────────────────┐
│           Integrações                    │
│  Notion API │ ClickUp API │ Google APIs  │
│  OpenAI/Gemini (sugestões, resumos)      │
└─────────────────────────────────────────┘
```

**Fluxo principal:**
1. Usuário cria projeto → sistema gera os 13 gates automaticamente
2. Cada gate tem checklist do SOP Enjoy + aprovadores do RACI
3. Checklist completo → notificação para aprovador → aprovação libera próximo gate
4. Dentro de cada gate → backlog de tarefas com status, responsável, prazo
5. IA sugere próximos passos, detecta impedimentos e resume status para o sponsor

## Modelo de Dados

Todas as tabelas com `tenant_id` para multi-tenant via Row Level Security.

```
tenants
users

projects
├── project_members     (RACI: user_id + role R/A/C/I + gate)
├── gates               (13 por projeto, gerados automaticamente)
│   ├── gate_items      (checklist do SOP Enjoy)
│   ├── gate_approvals  (quem aprovou, quando, condições)
│   └── tasks           (backlog dentro do gate)
│       ├── task_assignees
│       └── task_comments
├── dependencies        (from_id, to_id, type — grafo de dependências)
├── change_log          (mudanças de escopo/custo/prazo aprovadas)
└── impediments         (bloqueios com SLA 24-48h e escalonamento)

integrations            (tokens Notion/ClickUp/Google por tenant)
ai_embeddings           (vetores pgvector para busca semântica)
```

**Grafos:** tabela `dependencies(from_id, to_id, type)` — queries PostgreSQL para caminho crítico e visualização com React Flow.

**Realtime:** Supabase Realtime via websocket — updates de gates e tarefas ao vivo.

## Integrações e IA

**Edge Functions (Deno):**

| Função | O que faz |
|---|---|
| `sync-notion` | Cria/sincroniza páginas de gate/projeto no Notion (bidirecional) |
| `sync-clickup` | Exporta tarefas para ClickUp, importa updates de volta |
| `google-calendar` | Cria eventos de reuniões de gate (kickoff, review, retro) |
| `google-drive` | Organiza pasta do projeto no padrão Enjoy automaticamente |
| `ai-assistant` | Gemini/GPT: sugere próximos passos, resume status, detecta riscos |
| `webhooks` | Recebe eventos de Notion/ClickUp e atualiza o banco em tempo real |

**IA aplicada:**
- **Resumo executivo automático** — ao abrir um gate, IA gera parágrafo de status para o sponsor
- **Detecção de impedimento** — tarefa parada por 24h → alerta ao PM
- **Sugestão de RACI** — IA sugere papéis com base no tipo de projeto
- **Busca semântica** — encontra projetos/tarefas por significado via pgvector

## Frontend — Telas

```
/login
/dashboard                — todos os projetos + status dos gates
/projects/new             — criar projeto (gera 13 gates automaticamente)
/projects/:id             — timeline de gates + indicadores do projeto
/projects/:id/gate/:num   — gate: checklist + aprovações + tarefas
/projects/:id/tasks       — backlog completo
/projects/:id/raci        — matriz RACI visual
/projects/:id/graph       — grafo de dependências
/settings                 — integrações + usuários
```

**Componentes-chave:**
- `GateTimeline` — barra visual dos 13 gates (pendente/em andamento/aprovado/bloqueado)
- `ChecklistCard` — itens do gate com checkbox + upload de evidência
- `ApprovalFlow` — solicitar aprovação → notificar aprovador → aceite/rejeição com condições
- `TaskBoard` — kanban simples dentro do gate
- `DependencyGraph` — grafo interativo com React Flow

## Multi-tenant (futuro)

- `tenant_id` em todas as tabelas desde o início
- RLS no Supabase garante isolamento por empresa
- Subdomínios por tenant (`enjoy.linktask.app`, `cliente.linktask.app`)
- Planos/limites por tenant na tabela `tenants`
