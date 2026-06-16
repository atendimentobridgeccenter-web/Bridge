-- 010_coupons_table.sql
-- Tabela de cupons de desconto para o sistema de pagamento Bridge

create table if not exists public.coupons (
  id             uuid           primary key default gen_random_uuid(),
  code           text           not null unique,
  description    text,
  discount_type  text           not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2)  not null check (discount_value > 0),
  applies_to     text           not null default 'both' check (applies_to in ('enrollment', 'monthly', 'both')),
  max_uses       integer,
  uses_count     integer        not null default 0,
  active         boolean        not null default true,
  expires_at     timestamptz,
  created_at     timestamptz    not null default now()
);

alter table public.coupons enable row level security;

-- Qualquer visitante pode ler cupons para validar no formulário
drop policy if exists "anyone_select_coupons" on public.coupons;
create policy "anyone_select_coupons" on public.coupons
  for select
  to anon, authenticated
  using (true);

-- Apenas admins podem criar, editar e deletar cupons
drop policy if exists "admin_insert_coupons" on public.coupons;
create policy "admin_insert_coupons" on public.coupons
  for insert
  to authenticated
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "admin_update_coupons" on public.coupons;
create policy "admin_update_coupons" on public.coupons
  for update
  to authenticated
  using    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_delete_coupons" on public.coupons;
create policy "admin_delete_coupons" on public.coupons
  for delete
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create index if not exists coupons_code_idx    on public.coupons (code);
create index if not exists coupons_active_idx  on public.coupons (active);
