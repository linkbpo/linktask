# linktask — Google Integrations Design

**Date:** 2026-04-17
**Status:** Approved

## Objetivo

Integrar o linktask com o ecossistema Google (Sheets, Drive, BigQuery, Gemini) via Supabase Edge Functions, permitindo que dados de projetos/gates/tarefas sejam espelhados automaticamente no Google Workspace e que um assistente IA (Gemini) responda perguntas contextuais dentro do app.

## Decisões

| Pergunta | Decisão |
|---|---|
| Arquitetura de integração | Supabase Edge Functions (Deno) como hub central |
| Sheets | Push unidirecional linktask → Sheets (API v4, sem webhook) |
| BigQuery | Push unidirecional linktask → BigQuery (full refresh diário) |
| Drive | Push de estrutura de pastas ao criar projeto |
| Gemini | Assistente contextual dentro do app (Gemini API Key) |
| Autenticação | Service Account única com JWT + access_token renovável |

## Arquitetura

```
┌─────────────────────────────────────────────┐
│              linktask (React)                │
│  Chat Gemini │ Botão Sync │ Status Drive     │
└──────────────┬──────────────────────────────┘
               │ Supabase JS SDK
┌──────────────▼──────────────────────────────┐
│           Supabase                           │
│  PostgreSQL │ Realtime │ Secrets             │
│                                             │
│  Edge Functions (Deno):                     │
│  ┌──────────────┬─────────────┬───────────┐ │
│  │ gemini-chat  │ sync-drive  │ push-bq   │ │
│  │              │ push-sheets │           │ │
│  └──────┬───────┴─────────────┴───────────┘ │
└─────────┼───────────────────────────────────┘
          │ Google APIs (Service Account)
┌─────────▼───────────────────────────────────┐
│           Google                            │
│  Drive │ Sheets (push only) │ BigQuery      │
│  Gemini API                                 │
└─────────────────────────────────────────────┘
```

## Fluxos de Dados

| Integração | Direção | Trigger |
|---|---|---|
| Sheets | linktask → Sheets | Botão manual no app + pg_cron diário 7h |
| BigQuery | linktask → BigQuery | pg_cron diário 6h (full refresh) |
| Drive | linktask → Drive | Criação automática ao criar projeto |
| Gemini | app → Edge Function → Gemini API | Mensagem do usuário no chat |

## Detalhes por Integração

### push-sheets

**Planilha:** uma planilha Google dedicada por tenant

```
Aba: Projetos
Colunas: Nome | Status | Gate Atual | Gates Aprovados | PM | Sponsor | Atualizado em

Aba: Gates
Colunas: Projeto | Gate | Título | Status | Itens Checked | Total Itens | Aprovado Por | Data Aprovação

Aba: Tarefas
Colunas: Projeto | Gate | Título | Status | Responsável | Prazo
```

- Apaga e reescreve todas as linhas a cada sync (simples e confiável)
- Botão "Sincronizar com Google" no dashboard do linktask
- pg_cron roda diariamente às 7h como backup automático

### push-bq

**Dataset:** `linktask` no projeto GCP

```
Tabelas (full refresh diário às 6h):
  bq.projects   ← projects
  bq.gates      ← gates
  bq.tasks      ← tasks
  bq.gate_items ← gate_items
```

- Estratégia: DELETE + INSERT (full refresh) — simples para o volume da Enjoy
- Looker Studio conecta diretamente ao BigQuery para dashboards executivos

### sync-drive

```
Drive/
  Enjoy - Projetos/
    {nome-do-projeto}/
      Gate 1 - Onboarding/
      Gate 2 - Briefing/
      ...
      Gate 13 - Conclusão/
```

- Criação automática ao inserir projeto (trigger Supabase ou chamada direta)
- ID da pasta de cada gate salvo em tabela `drive_folders` no Supabase para upload futuro de evidências

### gemini-chat

- Modelo: Gemini 1.5 Flash (rápido e econômico)
- Contexto enviado: nome do projeto, gate atual, status dos gates, tarefas abertas, impedimentos
- Histórico: salvo em tabela `ai_conversations` (project_id, role, content, created_at)
- Interface: painel de chat no linktask (sidebar ou modal por projeto)

## Autenticação Google

**Service Account única** com as seguintes permissões:
```
Sheets API    → Editor na planilha específica
Drive API     → Editor na pasta "Enjoy - Projetos"
BigQuery      → roles/bigquery.dataEditor + roles/bigquery.jobUser
```

**Fluxo JWT nas Edge Functions:**
```
lê GOOGLE_SERVICE_ACCOUNT_JSON (Supabase Secret)
→ gera JWT assinado com a chave privada da service account
→ troca por access_token (OAuth2 token endpoint Google)
→ usa access_token nas chamadas às APIs (válido 1h)
→ renovado automaticamente a cada invocação
```

**Secrets no Supabase:**
```
GOOGLE_SERVICE_ACCOUNT_JSON  — JSON completo da service account
GOOGLE_SHEETS_ID             — ID da planilha de acompanhamento
GOOGLE_DRIVE_FOLDER_ID       — ID da pasta raiz no Drive
GOOGLE_BIGQUERY_PROJECT_ID   — ID do projeto GCP
GEMINI_API_KEY               — chave da Gemini API
```

## Tabelas adicionais no banco

```sql
-- Histórico do chat com Gemini
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- IDs das pastas Drive por projeto/gate
create table drive_folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  gate_number int,
  drive_folder_id text not null,
  created_at timestamptz not null default now()
);
```

## Por que API em vez de Webhook para Sheets

Webhook exigiria expor endpoint público e validar assinaturas — superfície de ataque desnecessária. Com push via Sheets API v4, a Edge Function controla totalmente quando e o que escreve, sem entrada externa não solicitada.
