-- ============================================================
-- BRIDGE: Product Engine — Draft-to-Live + Members Area
-- ============================================================
--
-- Segurança por camadas:
--   1. RLS bloqueia no banco de dados — não depende de código.
--   2. is_admin() verifica app_metadata do JWT (definido via service role).
--   3. product_structure só é lido se user_access existir para aquele par.
--   4. status='draft' → landing page retorna 404 ao público.
-- ============================================================

-- ── Helper: is_admin() ────────────────────────────────────────
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  )
$$;

-- ── Table: products ───────────────────────────────────────────
-- status: 'draft' | 'published' | 'archived'
-- landing_page_config → BlocksConfig JSONB  (mesma estrutura do blocks_config)
-- form_logic_config   → FormSchema JSONB    (mesma estrutura do bridge_forms.schema)
-- checkout_config     → { price_id, currency, trial_days, upsell_price_id }

create table if not exists products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique,
  description         text not null default '',
  status              text not null default 'draft'
                      check (status in ('draft', 'published', 'archived')),
  price_id_stripe     text,
  thumbnail_url       text,
  landing_page_config jsonb not null default '{"blocks":[]}'::jsonb,
  form_logic_config   jsonb not null default '{}'::jsonb,
  checkout_config     jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger products_updated_at
  before update on products
  for each row execute procedure update_updated_at();

create index if not exists idx_products_slug   on products(slug);
create index if not exists idx_products_status on products(status);

-- ── Table: product_structure ──────────────────────────────────
-- One row = one MODULE. Lessons live inside content_json.
--
-- content_json shape:
-- {
--   "lessons": [
--     { "id": "uuid", "title": "...", "type": "video"|"text"|"download",
--       "video_url": "", "text_content": "", "file_url": "",
--       "duration_min": 12, "order": 0, "free_preview": false }
--   ]
-- }

create table if not exists product_structure (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  title       text not null,
  description text not null default '',
  content_json jsonb not null default '{"lessons":[]}'::jsonb,
  order_index  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger product_structure_updated_at
  before update on product_structure
  for each row execute procedure update_updated_at();

create index if not exists idx_product_structure_product on product_structure(product_id, order_index);

-- ── Table: user_access ────────────────────────────────────────
-- Granted exclusively by the stripe-webhook-handler Edge Function
-- via service_role — never by the client.

create table if not exists user_access (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  product_id   uuid not null references products(id)   on delete cascade,
  purchased_at timestamptz not null default now(),
  stripe_session_id text,
  unique (user_id, product_id)
);

create index if not exists idx_user_access_user    on user_access(user_id);
create index if not exists idx_user_access_product on user_access(product_id);

-- ── RLS: products ─────────────────────────────────────────────
alter table products enable row level security;

-- Public sees only published products
create policy "public reads published products"
  on products for select
  using (status = 'published');

-- Admin sees and edits everything
create policy "admin full access on products"
  on products for all
  using    (is_admin() or auth.role() = 'service_role')
  with check (is_admin() or auth.role() = 'service_role');

-- ── RLS: product_structure ────────────────────────────────────
alter table product_structure enable row level security;

-- Critical: user can read module ONLY if they purchased the product
-- This query runs inside the DB — impossible to bypass via API.
create policy "purchased users read structure"
  on product_structure for select
  using (
    is_admin()
    or auth.role() = 'service_role'
    or exists (
      select 1 from user_access ua
      where ua.product_id = product_structure.product_id
        and ua.user_id    = auth.uid()
    )
  );

-- Admin manages structure
create policy "admin manages product_structure"
  on product_structure for all
  using    (is_admin() or auth.role() = 'service_role')
  with check (is_admin() or auth.role() = 'service_role');

-- ── RLS: user_access ─────────────────────────────────────────
alter table user_access enable row level security;

-- Users read their own access records
create policy "users read own access"
  on user_access for select
  using (user_id = auth.uid() or is_admin() or auth.role() = 'service_role');

-- Only service_role (webhook) inserts — client can never grant itself access
create policy "service role inserts access"
  on user_access for insert
  with check (auth.role() = 'service_role');

-- Admin can delete (revoke) access
create policy "admin deletes access"
  on user_access for delete
  using (is_admin() or auth.role() = 'service_role');

-- ── Seed: admin user setup helper ────────────────────────────
-- Run this in SQL editor after creating your admin user in Supabase Auth:
--
-- select set_admin_role('user-uuid-here');
--
create or replace function set_admin_role(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update auth.users
  set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
  where id = target_user_id;
end;
$$;

-- ── Seed: sample product ─────────────────────────────────────
insert into products (name, slug, description, status, landing_page_config, checkout_config)
values (
  'Bridge Masterclass',
  'bridge-masterclass',
  'Aprenda a construir funis de alta conversão com Bridge.',
  'draft',
  '{
    "blocks": [
      {
        "id": "hero-prod-001", "type": "HeroBlock", "order": 0,
        "props": {
          "title": "A Masterclass que vai transformar seu negócio",
          "subtitle": "Aprenda o método Bridge de lançamentos de alta conversão.",
          "backgroundImage": "", "buttonText": "Quero me inscrever", "buttonLink": "/apply"
        }
      },
      {
        "id": "cta-prod-001", "type": "CallToActionBlock", "order": 1,
        "props": {
          "title": "Vagas limitadas — Inscreva-se agora",
          "subtitle": "Método comprovado. Resultados reais.",
          "buttonText": "Garantir minha vaga", "buttonLink": "/apply"
        }
      }
    ]
  }'::jsonb,
  '{"price_id": "price_PLACEHOLDER", "currency": "brl"}'::jsonb
) on conflict (slug) do nothing;
