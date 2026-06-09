-- 007_leads_table.sql
-- Tabela de leads capturados pelos formulários de produtos Bridge

create table if not exists public.leads (
  id          uuid        primary key default gen_random_uuid(),
  product_id  uuid        references public.products(id) on delete cascade,
  email       text,
  phone       text,
  name        text,
  cpf         text,
  city        text,
  state       text,
  answers     jsonb       not null default '{}',
  qualified   boolean     not null default true,
  created_at  timestamptz not null default now()
);

alter table public.leads enable row level security;

-- qualquer visitante pode inserir um lead (anon key)
drop policy if exists "public_insert_leads" on public.leads;
create policy "public_insert_leads" on public.leads
  for insert
  to anon, authenticated
  with check (true);

-- somente admins podem ler leads
drop policy if exists "admin_select_leads" on public.leads;
create policy "admin_select_leads" on public.leads
  for select
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create index if not exists leads_product_id_idx on public.leads (product_id);
create index if not exists leads_created_at_idx  on public.leads (created_at desc);
