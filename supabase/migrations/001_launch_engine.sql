-- ============================================================
-- BRIDGE: Launch Engine Schema
-- ============================================================

-- Landing pages: stores slug + the blocks_config JSON
create table if not exists landing_pages (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null default '',
  published   boolean not null default false,
  blocks_config jsonb not null default '{"blocks":[]}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger landing_pages_updated_at
  before update on landing_pages
  for each row execute procedure update_updated_at();

-- Bridge leads: captures each applicant step-by-step
create table if not exists bridge_leads (
  id            uuid primary key default gen_random_uuid(),
  email         text,
  landing_page_slug text references landing_pages(slug) on delete set null,
  answers       jsonb not null default '{}'::jsonb,
  current_step  int  not null default 0,
  completed     boolean not null default false,
  stripe_session_id text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger bridge_leads_updated_at
  before update on bridge_leads
  for each row execute procedure update_updated_at();

-- Index for fast slug lookup on the public renderer
create index if not exists idx_landing_pages_slug on landing_pages(slug);
-- Index for cart-recovery by email
create index if not exists idx_bridge_leads_email on bridge_leads(email);

-- RLS: public can read published pages; admin can do everything
alter table landing_pages enable row level security;
alter table bridge_leads  enable row level security;

create policy "public reads published pages"
  on landing_pages for select
  using (published = true);

create policy "service role full access on landing_pages"
  on landing_pages for all
  using (auth.role() = 'service_role');

create policy "service role full access on bridge_leads"
  on bridge_leads for all
  using (auth.role() = 'service_role');

-- Leads can upsert their own row (anon inserts + updates by lead id)
create policy "anon inserts leads"
  on bridge_leads for insert
  with check (true);

create policy "anon updates own lead"
  on bridge_leads for update
  using (true);

-- Sample seed page (optional, for local dev)
insert into landing_pages (slug, title, published, blocks_config) values (
  'produto-principal',
  'Bridge Enterprise',
  true,
  '{
    "blocks": [
      {
        "id": "hero-001",
        "type": "HeroBlock",
        "order": 0,
        "props": {
          "title": "Escale seu negócio com Bridge",
          "subtitle": "A plataforma enterprise que converte mais e cresce com você.",
          "backgroundImage": "",
          "buttonText": "Quero começar",
          "buttonLink": "/apply"
        }
      },
      {
        "id": "features-001",
        "type": "FeaturesBlock",
        "order": 1,
        "props": {
          "headline": "Por que Bridge?",
          "features": [
            { "icon": "Zap",       "title": "Velocidade",    "description": "Lançamentos em dias, não meses." },
            { "icon": "Shield",    "title": "Segurança",     "description": "Infraestrutura enterprise com RLS e criptografia." },
            { "icon": "TrendingUp","title": "Conversão",     "description": "Funil otimizado com IA para máxima conversão." }
          ]
        }
      },
      {
        "id": "cta-001",
        "type": "CallToActionBlock",
        "order": 2,
        "props": {
          "title": "Pronto para o próximo nível?",
          "subtitle": "Junte-se a +500 empresas que já escalam com Bridge.",
          "buttonText": "Aplicar Agora",
          "buttonLink": "/apply"
        }
      }
    ]
  }'::jsonb
) on conflict (slug) do nothing;
