alter table public.clients
  add column project_id uuid references public.projects (id) on delete set null,
  add column kind text not null default '' check (length(kind) <= 40);

create index clients_project_idx on public.clients (project_id);
