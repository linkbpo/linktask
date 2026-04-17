-- Histórico do chat com Gemini
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index on ai_conversations (project_id);

alter table ai_conversations enable row level security;

create policy "users see project conversations"
  on ai_conversations for all
  using (project_id in (
    select id from projects
    where tenant_id = (select tenant_id from profiles where id = auth.uid())
  ))
  with check (project_id in (
    select id from projects
    where tenant_id = (select tenant_id from profiles where id = auth.uid())
  ));

-- IDs das pastas Drive por projeto/gate
create table drive_folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  gate_number int check (gate_number between 1 and 13),
  drive_folder_id text not null,
  created_at timestamptz not null default now(),
  unique(project_id, gate_number)
);

alter table drive_folders enable row level security;

create policy "users see drive folders"
  on drive_folders for all
  using (project_id in (
    select id from projects
    where tenant_id = (select tenant_id from profiles where id = auth.uid())
  ))
  with check (project_id in (
    select id from projects
    where tenant_id = (select tenant_id from profiles where id = auth.uid())
  ));
