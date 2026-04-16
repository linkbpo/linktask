# linktask MVP — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir o MVP do linktask — sistema de gestão de projetos da Enjoy com 13 gates do SOP, checklists, aprovações e backlog de tarefas.

**Architecture:** React + TypeScript + Vite no frontend. Supabase (PostgreSQL + Auth + Realtime) como backend completo. RLS com `tenant_id` em todas as tabelas para multi-tenant. React Query para cache e sincronização de dados. TailwindCSS + shadcn/ui para UI.

**Tech Stack:** React 18, TypeScript, Vite, Supabase JS v2, React Router v6, TanStack Query v5, TailwindCSS v3, shadcn/ui, React Flow, Vitest, React Testing Library

**Scope MVP:** Fases 1-3 (scaffold, banco, auth, projetos, gates, tarefas). Integrações externas (Notion, ClickUp, Google, IA) ficam para plano separado.

---

## Pré-requisitos

- [ ] Node.js 20+ instalado
- [ ] Conta no Supabase (supabase.com) — criar projeto "linktask"
- [ ] Copiar `SUPABASE_URL` e `SUPABASE_ANON_KEY` do painel do projeto

---

## FASE 1 — Foundation

### Task 1: Scaffold do projeto

**Files:**
- Create: `/c/Users/linol/.gemini/antigravity/scratch/linktask/` (projeto Vite)

**Step 1: Criar projeto Vite**

```bash
cd /c/Users/linol/.gemini/antigravity/scratch/
npm create vite@latest linktask-app -- --template react-ts
mv linktask-app/* linktask/
mv linktask-app/.* linktask/ 2>/dev/null || true
rmdir linktask-app
cd linktask
```

> Nota: o diretório `linktask` já existe com o `docs/` — apenas mova os arquivos gerados para dentro dele.

**Step 2: Instalar dependências**

```bash
cd /c/Users/linol/.gemini/antigravity/scratch/linktask
npm install
npm install @supabase/supabase-js react-router-dom @tanstack/react-query
npm install lucide-react @xyflow/react
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
npx tailwindcss init -p
```

**Step 3: Configurar Tailwind**

Editar `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Editar `src/index.css` — substituir conteúdo por:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Configurar Vitest**

Adicionar em `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

Criar `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

**Step 5: Criar arquivo de ambiente**

Criar `.env.local`:

```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

Criar `.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Criar `.gitignore` (adicionar se não existir):

```
node_modules
dist
.env.local
```

**Step 6: Verificar que roda**

```bash
npm run dev
```
Expected: servidor em http://localhost:5173 sem erros

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold react+vite+typescript project with supabase and tailwind"
```

---

### Task 2: Cliente Supabase + tipos base

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/types/database.ts`

**Step 1: Criar cliente Supabase**

Criar `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

**Step 2: Criar tipos base do banco**

Criar `src/types/database.ts` — tipos TypeScript que refletem o schema do Supabase:

```typescript
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: { id: string; name: string; slug: string; created_at: string }
        Insert: { id?: string; name: string; slug: string; created_at?: string }
        Update: { name?: string; slug?: string }
      }
      projects: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          status: 'active' | 'paused' | 'completed' | 'cancelled'
          current_gate: number
          sponsor_id: string | null
          pm_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          status?: 'active' | 'paused' | 'completed' | 'cancelled'
          current_gate?: number
          sponsor_id?: string | null
          pm_id?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          status?: 'active' | 'paused' | 'completed' | 'cancelled'
          current_gate?: number
          sponsor_id?: string | null
          pm_id?: string | null
        }
      }
      gates: {
        Row: {
          id: string
          project_id: string
          number: number
          title: string
          status: 'locked' | 'open' | 'pending_approval' | 'approved' | 'blocked'
          approved_by: string | null
          approved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          number: number
          title: string
          status?: 'locked' | 'open' | 'pending_approval' | 'approved' | 'blocked'
        }
        Update: {
          status?: 'locked' | 'open' | 'pending_approval' | 'approved' | 'blocked'
          approved_by?: string | null
          approved_at?: string | null
        }
      }
      gate_items: {
        Row: {
          id: string
          gate_id: string
          label: string
          checked: boolean
          evidence_url: string | null
          order: number
        }
        Insert: {
          id?: string
          gate_id: string
          label: string
          checked?: boolean
          evidence_url?: string | null
          order: number
        }
        Update: {
          checked?: boolean
          evidence_url?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          gate_id: string
          project_id: string
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'blocked' | 'done'
          assignee_id: string | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          gate_id: string
          project_id: string
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'blocked' | 'done'
          assignee_id?: string | null
          due_date?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'blocked' | 'done'
          assignee_id?: string | null
          due_date?: string | null
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'R' | 'A' | 'C' | 'I'
          gate_number: number | null
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: 'R' | 'A' | 'C' | 'I'
          gate_number?: number | null
        }
        Update: { role?: 'R' | 'A' | 'C' | 'I' }
      }
      impediments: {
        Row: {
          id: string
          project_id: string
          gate_id: string | null
          task_id: string | null
          description: string
          owner_id: string | null
          status: 'open' | 'resolved'
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          gate_id?: string | null
          task_id?: string | null
          description: string
          owner_id?: string | null
          status?: 'open' | 'resolved'
        }
        Update: { status?: 'open' | 'resolved'; resolved_at?: string | null }
      }
    }
  }
}
```

**Step 3: Escrever teste**

Criar `src/lib/supabase.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { supabase } from './supabase'

describe('supabase client', () => {
  it('should be defined', () => {
    expect(supabase).toBeDefined()
  })

  it('should have auth property', () => {
    expect(supabase.auth).toBeDefined()
  })
})
```

**Step 4: Rodar teste**

```bash
npm run test
```
Expected: 2 tests passing

**Step 5: Commit**

```bash
git add src/lib/supabase.ts src/types/database.ts src/lib/supabase.test.ts src/test/setup.ts
git commit -m "feat: add supabase client and typescript database types"
```

---

### Task 3: Schema do banco no Supabase

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Criar o arquivo de migration**

Criar `supabase/migrations/001_initial_schema.sql`:

```sql
-- Tenants
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Extend auth.users with tenant
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id),
  full_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active','paused','completed','cancelled')),
  current_gate int not null default 1,
  sponsor_id uuid references profiles(id),
  pm_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Gates (13 por projeto)
create table gates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  number int not null check (number between 1 and 13),
  title text not null,
  status text not null default 'locked' check (status in ('locked','open','pending_approval','approved','blocked')),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(project_id, number)
);

-- Gate checklist items
create table gate_items (
  id uuid primary key default gen_random_uuid(),
  gate_id uuid not null references gates(id) on delete cascade,
  label text not null,
  checked boolean not null default false,
  evidence_url text,
  "order" int not null
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  gate_id uuid not null references gates(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done')),
  assignee_id uuid references profiles(id),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Project members (RACI)
create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('R','A','C','I')),
  gate_number int,
  unique(project_id, user_id, role, gate_number)
);

-- Impediments
create table impediments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  gate_id uuid references gates(id),
  task_id uuid references tasks(id),
  description text not null,
  owner_id uuid references profiles(id),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Dependencies (grafo)
create table dependencies (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references tasks(id) on delete cascade,
  to_id uuid not null references tasks(id) on delete cascade,
  type text not null default 'blocks' check (type in ('blocks','related')),
  unique(from_id, to_id)
);

-- Change log
create table change_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  description text not null,
  impact text,
  approved_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- RLS: habilitar em todas as tabelas
alter table tenants enable row level security;
alter table profiles enable row level security;
alter table projects enable row level security;
alter table gates enable row level security;
alter table gate_items enable row level security;
alter table tasks enable row level security;
alter table project_members enable row level security;
alter table impediments enable row level security;
alter table dependencies enable row level security;
alter table change_log enable row level security;

-- Políticas RLS básicas (usuário vê apenas dados do seu tenant)
create policy "users see own profile"
  on profiles for all using (auth.uid() = id);

create policy "users see tenant projects"
  on projects for all
  using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

create policy "users see project gates"
  on gates for all
  using (project_id in (
    select id from projects
    where tenant_id = (select tenant_id from profiles where id = auth.uid())
  ));

create policy "users see gate items"
  on gate_items for all
  using (gate_id in (
    select g.id from gates g
    join projects p on p.id = g.project_id
    where p.tenant_id = (select tenant_id from profiles where id = auth.uid())
  ));

create policy "users see tasks"
  on tasks for all
  using (project_id in (
    select id from projects
    where tenant_id = (select tenant_id from profiles where id = auth.uid())
  ));

create policy "users see members"
  on project_members for all
  using (project_id in (
    select id from projects
    where tenant_id = (select tenant_id from profiles where id = auth.uid())
  ));

create policy "users see impediments"
  on impediments for all
  using (project_id in (
    select id from projects
    where tenant_id = (select tenant_id from profiles where id = auth.uid())
  ));
```

**Step 2: Criar seed com os 13 gates do SOP Enjoy**

Criar `supabase/seed/gates_template.sql`:

```sql
-- Usado pela função create_project_gates() — não rodar diretamente
-- Referência dos 13 gates e seus checklist items padrão

-- Exemplo de como os gates são inseridos via função:
-- insert into gates (project_id, number, title, status) values
--   (project_id, 1, 'Onboarding', case when 1 = 1 then 'open' else 'locked' end),
--   (project_id, 2, 'Briefing', 'locked'),
--   ...até 13

-- Títulos dos 13 gates:
-- 1: Onboarding
-- 2: Briefing
-- 3: Apresentação Básica do Projeto
-- 4: RACI (Inicial)
-- 5: Orçamento
-- 6: Business Plan
-- 7: Apresentação BP
-- 8: Atualização do RACI
-- 9: Execução
-- 10: Ajuste
-- 11: Entrega
-- 12: Documentação Atualizada
-- 13: Conclusão
```

**Step 3: Criar função PostgreSQL para gerar gates automaticamente**

Adicionar ao final de `supabase/migrations/001_initial_schema.sql`:

```sql
-- Função: cria os 13 gates + checklist items ao criar um projeto
create or replace function create_project_gates(p_project_id uuid)
returns void language plpgsql as $$
declare
  gate_ids uuid[] := array[]::uuid[];
  gid uuid;
begin
  -- Inserir os 13 gates
  with inserted as (
    insert into gates (project_id, number, title, status) values
      (p_project_id, 1,  'Onboarding',                  'open'),
      (p_project_id, 2,  'Briefing',                    'locked'),
      (p_project_id, 3,  'Apresentação Básica',          'locked'),
      (p_project_id, 4,  'RACI Inicial',                'locked'),
      (p_project_id, 5,  'Orçamento',                   'locked'),
      (p_project_id, 6,  'Business Plan',               'locked'),
      (p_project_id, 7,  'Apresentação BP',             'locked'),
      (p_project_id, 8,  'Atualização do RACI',         'locked'),
      (p_project_id, 9,  'Execução',                    'locked'),
      (p_project_id, 10, 'Ajuste',                      'locked'),
      (p_project_id, 11, 'Entrega',                     'locked'),
      (p_project_id, 12, 'Documentação Atualizada',     'locked'),
      (p_project_id, 13, 'Conclusão',                   'locked')
    returning id, number
  )
  -- Inserir checklist items por gate
  insert into gate_items (gate_id, label, "order")
  select g.id, item.label, item.ord from inserted g
  cross join lateral (
    select unnest(array[
      case g.number
        when 1 then array[
          'Sponsor e Owner confirmados',
          'Time-base definido',
          'Canais oficiais criados',
          'Regras de comunicação definidas',
          'Acessos liberados',
          'Cadência mínima definida',
          'Pasta do projeto criada no padrão Enjoy'
        ]
        when 2 then array[
          'Problema e contexto descritos com clareza',
          'Objetivo mensurável definido',
          'Critérios de sucesso/KPIs definidos',
          'Restrições registradas',
          'Premissas e riscos iniciais registrados',
          'Stakeholders mapeados'
        ]
        when 3 then array[
          'Visão do projeto sintetizada',
          'Escopo macro definido (in/out)',
          'Linha do tempo macro apresentada',
          'Kickoff realizado',
          'Decisões e próximos passos registrados'
        ]
        when 4 then array[
          'Entregas-chave listadas',
          'Responsável por entrega definido (R)',
          'Aprovador/Accountable definido (A)',
          'Consultados/Informados definidos (C/I)',
          'Regras de escalonamento definidas'
        ]
        when 5 then array[
          'Estimativa de custo por categoria',
          'Cenários definidos (mínimo/base/robusto)',
          'Centro de custo definido',
          'Limites de aprovação por alçada definidos',
          'Frequência de acompanhamento definida',
          'Reserva/buffer previsto'
        ]
        when 6 then array[
          'Proposta de valor definida',
          'Beneficiários e impacto esperados claros',
          'Roadmap macro com fases e marcos',
          'KPIs definidos',
          'Análise de viabilidade registrada',
          'Matriz de riscos e plano de mitigação'
        ]
        when 7 then array[
          'BP apresentado com clareza',
          'Decisão registrada (aprovado/ajustes/reprovado)',
          'Condições documentadas',
          'Próximos passos definidos e comunicados'
        ]
        when 8 then array[
          'Responsáveis atualizados conforme BP',
          'Aprovadores por etapa definidos',
          'Responsáveis por compras/contratos definidos',
          'Rota de escalonamento definida com SLA',
          'Stakeholders e comunicação ajustados'
        ]
        when 9 then array[
          'Backlog quebrado em itens executáveis',
          'Itens Ready antes de entrar no sprint',
          'Cadência rodando (planejamento/review/retro)',
          'Impedimentos registrados e com dono',
          'Dependências registradas',
          'Controle de WIP aplicado',
          'Status report semanal enviado ao sponsor'
        ]
        when 10 then array[
          'Feedback consolidado',
          'Repriorização feita por valor e restrição',
          'Trade-off registrado',
          'Mudanças de escopo aprovadas',
          'Plano atualizado e comunicado'
        ]
        when 11 then array[
          'Critérios de aceite atendidos e validados',
          'Evidência anexada',
          'Handover realizado',
          'Plano de suporte pós-go-live definido',
          'Pendências registradas como backlog futuro'
        ]
        when 12 then array[
          'SOP/POP/Playbooks atualizados',
          'Fluxos, padrões e regras registradas',
          'Decisões importantes registradas',
          'Repositório final organizado',
          'Indicadores e baseline final atualizados',
          'Responsável pela manutenção definido'
        ]
        when 13 then array[
          'Relatório final: resultado vs objetivo',
          'Retro final com aprendizados e padrões',
          'Encerramento de contratos/fornecedores',
          'Próximos passos recomendados',
          'Status alterado para Concluído e comunicação feita'
        ]
        else array[]::text[]
      end
    ]) with ordinality as item(label, ord)
  ) item;
end;
$$;

-- Trigger: chamar create_project_gates ao inserir projeto
create or replace function trigger_create_project_gates()
returns trigger language plpgsql as $$
begin
  perform create_project_gates(new.id);
  return new;
end;
$$;

create trigger on_project_created
  after insert on projects
  for each row execute function trigger_create_project_gates();
```

**Step 4: Executar migration no Supabase**

No painel do Supabase → SQL Editor → colar o conteúdo de `001_initial_schema.sql` → Run.

**Step 5: Verificar no Supabase**

No painel → Table Editor → confirmar que as tabelas foram criadas.

Testar o trigger: criar um projeto de teste no SQL Editor:

```sql
-- Criar tenant de teste
insert into tenants (name, slug) values ('Enjoy', 'enjoy') returning id;

-- Usar o id retornado para criar um projeto:
insert into projects (tenant_id, name) values ('<tenant_id_aqui>', 'Projeto Teste') returning id;

-- Verificar que 13 gates foram criados:
select number, title, status from gates where project_id = '<project_id_aqui>' order by number;
```

Expected: 13 linhas com gates, gate 1 com status `open`, demais `locked`.

**Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add supabase schema with 13 gates trigger and RLS policies"
```

---

### Task 4: Auth — contexto e hook

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/hooks/useAuth.ts`
- Create: `src/contexts/AuthContext.test.tsx`

**Step 1: Criar AuthContext**

Criar `src/contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

**Step 2: Escrever teste**

Criar `src/contexts/AuthContext.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

function TestComponent() {
  const { user, loading } = useAuth()
  return <div>{loading ? 'loading' : user ? 'logged in' : 'logged out'}</div>
}

describe('AuthContext', () => {
  it('renders without crashing', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>)
    expect(screen.getByText('loading')).toBeTruthy()
  })

  it('throws when used outside AuthProvider', () => {
    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within AuthProvider')
  })
})
```

**Step 3: Rodar testes**

```bash
npm run test
```
Expected: todos passando

**Step 4: Commit**

```bash
git add src/contexts/AuthContext.tsx src/contexts/AuthContext.test.tsx
git commit -m "feat: add auth context with supabase session management"
```

---

### Task 5: App shell — roteamento e layout

**Files:**
- Create: `src/main.tsx` (atualizar)
- Create: `src/App.tsx` (atualizar)
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/pages/LoginPage.tsx`
- Create: `src/pages/DashboardPage.tsx`

**Step 1: Configurar React Query + Router em `src/main.tsx`**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
```

**Step 2: Configurar rotas em `src/App.tsx`**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'
import GatePage from './pages/GatePage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><AppShell /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="projects/:projectId" element={<ProjectPage />} />
        <Route path="projects/:projectId/gate/:gateNumber" element={<GatePage />} />
      </Route>
    </Routes>
  )
}
```

**Step 3: Criar AppShell com sidebar**

Criar `src/components/layout/AppShell.tsx`:

```typescript
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppShell() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
```

Criar `src/components/layout/Sidebar.tsx`:

```typescript
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function Sidebar() {
  const { signOut } = useAuth()
  const location = useLocation()

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  ]

  return (
    <aside className="w-60 bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-indigo-600">linktask</h1>
        <p className="text-xs text-gray-400">by Enjoy</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === to
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t">
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
```

**Step 4: Criar LoginPage**

Criar `src/pages/LoginPage.tsx`:

```typescript
import { useState, FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-indigo-600 mb-1">linktask</h1>
        <p className="text-sm text-gray-500 mb-6">Gestão de projetos Enjoy</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 5: Criar páginas placeholder**

Criar `src/pages/DashboardPage.tsx`:

```typescript
export default function DashboardPage() {
  return <h2 className="text-2xl font-bold">Dashboard</h2>
}
```

Criar `src/pages/ProjectPage.tsx`:

```typescript
export default function ProjectPage() {
  return <h2 className="text-2xl font-bold">Projeto</h2>
}
```

Criar `src/pages/GatePage.tsx`:

```typescript
export default function GatePage() {
  return <h2 className="text-2xl font-bold">Gate</h2>
}
```

**Step 6: Verificar no browser**

```bash
npm run dev
```
Expected: login page em `/login`, redirect para `/` após login, sidebar visível, logout funciona.

**Step 7: Commit**

```bash
git add src/
git commit -m "feat: add app shell with routing, sidebar, and login page"
```

---

## FASE 2 — Core Features

### Task 6: Dashboard — listar projetos

**Files:**
- Create: `src/hooks/useProjects.ts`
- Modify: `src/pages/DashboardPage.tsx`
- Create: `src/components/projects/ProjectCard.tsx`
- Create: `src/hooks/useProjects.test.ts`

**Step 1: Criar hook de projetos**

Criar `src/hooks/useProjects.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, gates(id, number, status)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      // tenant_id vem do RLS (perfil do usuário logado)
      // Por ora, buscar o tenant_id do profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .single()
      if (!profile?.tenant_id) throw new Error('Usuário sem tenant configurado')

      const { data, error } = await supabase
        .from('projects')
        .insert({ name, description, tenant_id: profile.tenant_id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}
```

**Step 2: Criar ProjectCard**

Criar `src/components/projects/ProjectCard.tsx`:

```typescript
import { Link } from 'react-router-dom'
import { CheckCircle, Circle, Lock } from 'lucide-react'

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
} as const

interface Gate { id: string; number: number; status: string }
interface Project {
  id: string
  name: string
  status: keyof typeof STATUS_COLORS
  current_gate: number
  gates: Gate[]
}

export default function ProjectCard({ project }: { project: Project }) {
  const approvedCount = project.gates.filter(g => g.status === 'approved').length

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{project.name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status]}`}>
          {project.status}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        Gate atual: <span className="font-medium text-gray-700">{project.current_gate}/13</span>
        {' · '}{approvedCount} aprovados
      </p>
      <div className="flex gap-1">
        {Array.from({ length: 13 }, (_, i) => {
          const gate = project.gates.find(g => g.number === i + 1)
          const status = gate?.status ?? 'locked'
          return status === 'approved'
            ? <CheckCircle key={i} size={14} className="text-green-500" />
            : status === 'locked'
            ? <Lock key={i} size={14} className="text-gray-300" />
            : <Circle key={i} size={14} className="text-indigo-400" />
        })}
      </div>
    </Link>
  )
}
```

**Step 3: Atualizar DashboardPage**

```typescript
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useProjects, useCreateProject } from '../hooks/useProjects'
import ProjectCard from '../components/projects/ProjectCard'

export default function DashboardPage() {
  const { data: projects, isLoading } = useProjects()
  const createProject = useCreateProject()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await createProject.mutateAsync({ name })
    setName('')
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Projetos</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus size={16} /> Novo Projeto
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-white border rounded-xl p-4 flex gap-3">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome do projeto"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Criar
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500">
            Cancelar
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : projects?.length === 0 ? (
        <p className="text-gray-400">Nenhum projeto ainda. Crie o primeiro!</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map(p => <ProjectCard key={p.id} project={p as any} />)}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Verificar no browser**

- Dashboard mostra projetos
- Botão "Novo Projeto" abre form
- Criar projeto → aparece no grid com 13 ícones de gate

**Step 5: Commit**

```bash
git add src/hooks/useProjects.ts src/components/projects/ProjectCard.tsx src/pages/DashboardPage.tsx
git commit -m "feat: add dashboard with project listing and creation"
```

---

### Task 7: ProjectPage — timeline de gates

**Files:**
- Create: `src/hooks/useProject.ts`
- Modify: `src/pages/ProjectPage.tsx`
- Create: `src/components/gates/GateTimeline.tsx`

**Step 1: Criar hook do projeto**

Criar `src/hooks/useProject.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function useProject() {
  const { projectId } = useParams<{ projectId: string }>()

  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, gates(*, gate_items(*))')
        .eq('id', projectId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })
}
```

**Step 2: Criar GateTimeline**

Criar `src/components/gates/GateTimeline.tsx`:

```typescript
import { Link, useParams } from 'react-router-dom'
import { CheckCircle, Circle, Lock, AlertCircle, Clock } from 'lucide-react'

const STATUS_CONFIG = {
  locked:           { icon: Lock,         color: 'text-gray-300', bg: 'bg-gray-50',    label: 'Bloqueado' },
  open:             { icon: Circle,       color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Aberto' },
  pending_approval: { icon: Clock,        color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Aguardando aprovação' },
  approved:         { icon: CheckCircle,  color: 'text-green-500',  bg: 'bg-green-50',  label: 'Aprovado' },
  blocked:          { icon: AlertCircle,  color: 'text-red-500',    bg: 'bg-red-50',    label: 'Bloqueado' },
} as const

interface Gate {
  id: string
  number: number
  title: string
  status: keyof typeof STATUS_CONFIG
  gate_items: { id: string; checked: boolean }[]
}

export default function GateTimeline({ gates }: { gates: Gate[] }) {
  const { projectId } = useParams()

  return (
    <div className="space-y-2">
      {gates.map((gate) => {
        const config = STATUS_CONFIG[gate.status]
        const Icon = config.icon
        const checkedCount = gate.gate_items.filter(i => i.checked).length
        const totalCount = gate.gate_items.length
        const isClickable = gate.status !== 'locked'

        const content = (
          <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${config.bg} ${isClickable ? 'cursor-pointer hover:shadow-sm' : 'opacity-60'}`}>
            <div className="flex-shrink-0">
              <Icon size={20} className={config.color} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400">Gate {gate.number}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.color} bg-white border`}>
                  {config.label}
                </span>
              </div>
              <p className="font-medium text-gray-900 text-sm mt-0.5">{gate.title}</p>
            </div>
            {totalCount > 0 && (
              <div className="text-right text-xs text-gray-500">
                <span className={checkedCount === totalCount ? 'text-green-600 font-medium' : ''}>
                  {checkedCount}/{totalCount}
                </span>
                <p>itens</p>
              </div>
            )}
          </div>
        )

        return isClickable ? (
          <Link key={gate.id} to={`/projects/${projectId}/gate/${gate.number}`}>
            {content}
          </Link>
        ) : (
          <div key={gate.id}>{content}</div>
        )
      })}
    </div>
  )
}
```

**Step 3: Atualizar ProjectPage**

```typescript
import { useProject } from '../hooks/useProject'
import GateTimeline from '../components/gates/GateTimeline'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ProjectPage() {
  const { data: project, isLoading } = useProject()

  if (isLoading) return <p className="text-gray-500">Carregando projeto...</p>
  if (!project) return <p className="text-red-500">Projeto não encontrado.</p>

  const sortedGates = [...(project.gates ?? [])].sort((a, b) => a.number - b.number)

  return (
    <div className="max-w-2xl">
      <Link to="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Projetos
      </Link>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{project.name}</h2>
      {project.description && <p className="text-gray-500 text-sm mb-6">{project.description}</p>}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Gates do Projeto</h3>
      <GateTimeline gates={sortedGates as any} />
    </div>
  )
}
```

**Step 4: Verificar**

- Clicar num projeto → ver os 13 gates
- Gate 1 clicável, demais bloqueados
- Indicador de itens checked/total

**Step 5: Commit**

```bash
git add src/hooks/useProject.ts src/components/gates/GateTimeline.tsx src/pages/ProjectPage.tsx
git commit -m "feat: add project page with gate timeline"
```

---

### Task 8: GatePage — checklist + aprovação

**Files:**
- Create: `src/hooks/useGate.ts`
- Modify: `src/pages/GatePage.tsx`
- Create: `src/components/gates/ChecklistCard.tsx`
- Create: `src/components/gates/ApprovalFlow.tsx`

**Step 1: Criar hook do gate**

Criar `src/hooks/useGate.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function useGate() {
  const { projectId, gateNumber } = useParams<{ projectId: string; gateNumber: string }>()

  return useQuery({
    queryKey: ['gate', projectId, gateNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gates')
        .select('*, gate_items(*), tasks(*)')
        .eq('project_id', projectId!)
        .eq('number', Number(gateNumber))
        .single()
      if (error) throw error
      return data
    },
    enabled: !!projectId && !!gateNumber,
  })
}

export function useToggleGateItem() {
  const queryClient = useQueryClient()
  const { projectId, gateNumber } = useParams<{ projectId: string; gateNumber: string }>()

  return useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: string; checked: boolean }) => {
      const { error } = await supabase
        .from('gate_items')
        .update({ checked })
        .eq('id', itemId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate', projectId, gateNumber] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}

export function useRequestApproval() {
  const queryClient = useQueryClient()
  const { projectId, gateNumber } = useParams<{ projectId: string; gateNumber: string }>()

  return useMutation({
    mutationFn: async (gateId: string) => {
      const { error } = await supabase
        .from('gates')
        .update({ status: 'pending_approval' })
        .eq('id', gateId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gate', projectId, gateNumber] }),
  })
}

export function useApproveGate() {
  const queryClient = useQueryClient()
  const { projectId, gateNumber } = useParams<{ projectId: string; gateNumber: string }>()

  return useMutation({
    mutationFn: async ({ gateId, projectId: pid, nextGateNumber }: { gateId: string; projectId: string; nextGateNumber: number }) => {
      // Aprovar gate atual
      await supabase.from('gates').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', gateId)
      // Abrir próximo gate (se existir)
      if (nextGateNumber <= 13) {
        await supabase.from('gates').update({ status: 'open' }).eq('project_id', pid).eq('number', nextGateNumber)
        await supabase.from('projects').update({ current_gate: nextGateNumber }).eq('id', pid)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate', projectId, gateNumber] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
```

**Step 2: Criar ChecklistCard**

Criar `src/components/gates/ChecklistCard.tsx`:

```typescript
import { useToggleGateItem } from '../../hooks/useGate'

interface GateItem {
  id: string
  label: string
  checked: boolean
  order: number
}

export default function ChecklistCard({ items, gateStatus }: { items: GateItem[]; gateStatus: string }) {
  const toggle = useToggleGateItem()
  const sorted = [...items].sort((a, b) => a.order - b.order)
  const isEditable = gateStatus === 'open'

  return (
    <div className="bg-white border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Checklist do Gate</h3>
      <ul className="space-y-2">
        {sorted.map(item => (
          <li key={item.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={item.checked}
              disabled={!isEditable}
              onChange={e => toggle.mutate({ itemId: item.id, checked: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded text-indigo-600 cursor-pointer disabled:cursor-not-allowed"
            />
            <span className={`text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

**Step 3: Criar ApprovalFlow**

Criar `src/components/gates/ApprovalFlow.tsx`:

```typescript
import { useRequestApproval, useApproveGate } from '../../hooks/useGate'
import { CheckCircle, Clock, Send } from 'lucide-react'

interface Props {
  gateId: string
  projectId: string
  gateNumber: number
  status: string
  allItemsChecked: boolean
}

export default function ApprovalFlow({ gateId, projectId, gateNumber, status, allItemsChecked }: Props) {
  const requestApproval = useRequestApproval()
  const approveGate = useApproveGate()

  if (status === 'approved') {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-xl p-4">
        <CheckCircle size={18} />
        <span className="text-sm font-medium">Gate aprovado</span>
      </div>
    )
  }

  if (status === 'pending_approval') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-yellow-700 mb-3">
          <Clock size={18} />
          <span className="text-sm font-medium">Aguardando aprovação</span>
        </div>
        <button
          onClick={() => approveGate.mutate({ gateId, projectId, nextGateNumber: gateNumber + 1 })}
          className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          Aprovar Gate {gateNumber}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Aprovação</h3>
      {!allItemsChecked && (
        <p className="text-xs text-gray-400 mb-3">Complete todos os itens do checklist para solicitar aprovação.</p>
      )}
      <button
        disabled={!allItemsChecked || requestApproval.isPending}
        onClick={() => requestApproval.mutate(gateId)}
        className="flex items-center gap-2 w-full justify-center bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send size={14} />
        Solicitar Aprovação
      </button>
    </div>
  )
}
```

**Step 4: Atualizar GatePage**

```typescript
import { useGate } from '../hooks/useGate'
import { useParams, Link } from 'react-router-dom'
import ChecklistCard from '../components/gates/ChecklistCard'
import ApprovalFlow from '../components/gates/ApprovalFlow'
import { ArrowLeft } from 'lucide-react'

export default function GatePage() {
  const { data: gate, isLoading } = useGate()
  const { projectId, gateNumber } = useParams()

  if (isLoading) return <p className="text-gray-500">Carregando gate...</p>
  if (!gate) return <p className="text-red-500">Gate não encontrado.</p>

  const allItemsChecked = gate.gate_items.every((i: any) => i.checked)

  return (
    <div className="max-w-xl">
      <Link to={`/projects/${projectId}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Projeto
      </Link>
      <div className="mb-6">
        <p className="text-xs text-gray-400 font-mono">Gate {gateNumber}</p>
        <h2 className="text-2xl font-bold text-gray-900">{gate.title}</h2>
      </div>
      <div className="space-y-4">
        <ChecklistCard items={gate.gate_items as any} gateStatus={gate.status} />
        <ApprovalFlow
          gateId={gate.id}
          projectId={projectId!}
          gateNumber={Number(gateNumber)}
          status={gate.status}
          allItemsChecked={allItemsChecked}
        />
      </div>
    </div>
  )
}
```

**Step 5: Verificar**

- Abrir gate → ver checklist
- Marcar todos os itens → botão "Solicitar Aprovação" fica ativo
- Solicitar aprovação → status muda para "Aguardando aprovação"
- Aprovar → gate fica verde, próximo gate abre

**Step 6: Commit**

```bash
git add src/hooks/useGate.ts src/components/gates/ src/pages/GatePage.tsx
git commit -m "feat: add gate page with checklist and approval flow"
```

---

### Task 9: TaskBoard — kanban dentro do gate

**Files:**
- Create: `src/hooks/useTasks.ts`
- Create: `src/components/tasks/TaskBoard.tsx`
- Create: `src/components/tasks/TaskCard.tsx`
- Modify: `src/pages/GatePage.tsx`

**Step 1: Criar hook de tasks**

Criar `src/hooks/useTasks.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useTasks(gateId: string) {
  return useQuery({
    queryKey: ['tasks', gateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('gate_id', gateId)
        .order('created_at')
      if (error) throw error
      return data
    },
    enabled: !!gateId,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ gateId, projectId, title }: { gateId: string; projectId: string; title: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ gate_id: gateId, project_id: projectId, title })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['tasks', variables.gateId] }),
  })
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, status, gateId }: { taskId: string; status: string; gateId: string }) => {
      const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId)
      if (error) throw error
      return { gateId }
    },
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['tasks', variables.gateId] }),
  })
}
```

**Step 2: Criar TaskCard**

Criar `src/components/tasks/TaskCard.tsx`:

```typescript
const STATUS_LABELS = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  blocked: 'Bloqueado',
  done: 'Concluído',
}

interface Task { id: string; title: string; status: keyof typeof STATUS_LABELS }

export default function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (status: string) => void }) {
  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm">
      <p className="text-sm text-gray-800 mb-2">{task.title}</p>
      <select
        value={task.status}
        onChange={e => onStatusChange(e.target.value)}
        className="text-xs border rounded px-2 py-1 text-gray-600 w-full"
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  )
}
```

**Step 3: Criar TaskBoard**

Criar `src/components/tasks/TaskBoard.tsx`:

```typescript
import { useState, FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useTasks, useCreateTask, useUpdateTaskStatus } from '../../hooks/useTasks'
import TaskCard from './TaskCard'

const COLUMNS = [
  { status: 'todo',        label: 'A fazer',       color: 'bg-gray-100' },
  { status: 'in_progress', label: 'Em andamento',  color: 'bg-blue-50' },
  { status: 'blocked',     label: 'Bloqueado',     color: 'bg-red-50' },
  { status: 'done',        label: 'Concluído',     color: 'bg-green-50' },
]

export default function TaskBoard({ gateId, projectId }: { gateId: string; projectId: string }) {
  const { data: tasks = [] } = useTasks(gateId)
  const createTask = useCreateTask()
  const updateStatus = useUpdateTaskStatus()
  const [newTitle, setNewTitle] = useState('')

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await createTask.mutateAsync({ gateId, projectId, title: newTitle })
    setNewTitle('')
  }

  return (
    <div className="bg-white border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Tarefas</h3>
      <form onSubmit={handleCreate} className="flex gap-2 mb-4">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Nova tarefa..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button type="submit" className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm">
          <Plus size={14} /> Adicionar
        </button>
      </form>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {COLUMNS.map(col => (
          <div key={col.status} className={`rounded-lg p-3 ${col.color}`}>
            <p className="text-xs font-semibold text-gray-500 mb-2">{col.label}</p>
            <div className="space-y-2">
              {tasks.filter((t: any) => t.status === col.status).map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={status => updateStatus.mutate({ taskId: task.id, status, gateId })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Adicionar TaskBoard à GatePage**

Adicionar ao final de `src/pages/GatePage.tsx`, dentro de `<div className="space-y-4">`:

```typescript
import TaskBoard from '../components/tasks/TaskBoard'

// Adicionar após ApprovalFlow:
<TaskBoard gateId={gate.id} projectId={projectId!} />
```

**Step 5: Verificar**

- Gate page mostra kanban abaixo do checklist
- Criar tarefas → aparecem em "A fazer"
- Mudar status → tarefa move de coluna

**Step 6: Commit**

```bash
git add src/hooks/useTasks.ts src/components/tasks/ src/pages/GatePage.tsx
git commit -m "feat: add kanban task board within gate"
```

---

## FASE 3 — Publicar no GitHub

### Task 10: Criar repositório e primeiro push

**Step 1: Criar repo no GitHub**

```bash
cd /c/Users/linol/.gemini/antigravity/scratch/linktask
"/c/Program Files/GitHub CLI/gh.exe" repo create linktask --public --source=. --remote=origin --push
```

Expected: repositório criado em `github.com/linkbpo/linktask`, código enviado.

**Step 2: Verificar**

```bash
"/c/Program Files/GitHub CLI/gh.exe" repo view linkbpo/linktask
```

**Step 3: Confirmar hook ativo**

O hook `doc-github.sh` passará a documentar automaticamente todas as próximas implementações neste repositório via commit + issue + PR.

---

## Próximos planos (fora deste MVP)

- **Plano 2:** RACI matrix visual, grafo de dependências com React Flow, impedimentos
- **Plano 3:** Supabase Edge Functions — integrações Notion, ClickUp, Google Calendar/Drive
- **Plano 4:** IA — Gemini/GPT para resumos executivos, detecção de impedimentos, sugestão de RACI
