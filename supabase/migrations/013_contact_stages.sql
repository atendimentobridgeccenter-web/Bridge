-- 013_contact_stages.sql
-- Pipeline de estágios por contato (chave: email lowercase ou telefone)

create table if not exists public.contact_stages (
  id          uuid        primary key default gen_random_uuid(),
  contact_key text        not null unique,  -- lower(email) ou phone
  stage       text        not null default 'novo'
                check (stage in ('novo','em_contato','proposta','fechado','perdido')),
  note        text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid        references auth.users(id)
);

create table if not exists public.contact_stage_history (
  id             uuid        primary key default gen_random_uuid(),
  contact_key    text        not null,
  stage          text        not null,
  previous_stage text,
  note           text,
  changed_at     timestamptz not null default now(),
  changed_by     uuid        references auth.users(id)
);

alter table public.contact_stages         enable row level security;
alter table public.contact_stage_history  enable row level security;

create policy "admin_contact_stages" on public.contact_stages
  for all to authenticated
  using    ((auth.jwt()->'app_metadata'->>'role')='admin' or auth.role()='service_role')
  with check ((auth.jwt()->'app_metadata'->>'role')='admin' or auth.role()='service_role');

create policy "admin_contact_stage_history" on public.contact_stage_history
  for all to authenticated
  using    ((auth.jwt()->'app_metadata'->>'role')='admin' or auth.role()='service_role')
  with check ((auth.jwt()->'app_metadata'->>'role')='admin' or auth.role()='service_role');

create index if not exists contact_stages_key_idx          on public.contact_stages (contact_key);
create index if not exists contact_stage_history_key_idx   on public.contact_stage_history (contact_key);
create index if not exists contact_stage_history_time_idx  on public.contact_stage_history (changed_at desc);
