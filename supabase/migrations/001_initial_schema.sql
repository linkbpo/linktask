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

-- Políticas RLS básicas
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

-- Função: cria os 13 gates + checklist items ao criar um projeto
create or replace function create_project_gates(p_project_id uuid)
returns void language plpgsql as $$
begin
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
    (p_project_id, 13, 'Conclusão',                   'locked');

  insert into gate_items (gate_id, label, "order")
  select g.id, item.label, item.ord
  from gates g
  cross join lateral (
    select unnest(
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
    ) with ordinality as item(label, ord)
  ) item
  where g.project_id = p_project_id;
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
