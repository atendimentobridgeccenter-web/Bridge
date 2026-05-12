-- ============================================================
-- BRIDGE: Dynamic Forms + Pricing Rules
-- ============================================================
--
-- Schema JSONB de `bridge_forms.schema`:
-- {
--   "steps": [
--     { "id": "s1", "question": "...", "type": "email"|"text"|"select"|"multiselect",
--       "field": "email", "required": true, "placeholder": "...",
--       "options": [{ "value": "v", "label": "L", "nextStep": "s2" }],
--       "nextStep": "s2"   ← usado quando type != select
--     }
--   ],
--   "default_price_id":  "price_BASE001",
--   "default_label":     "Plano Base Bridge",
--   "default_amount":    49700,          ← centavos (R$ 497,00)
--   "allowed_price_ids": ["price_BASE001", "price_PRO002", "price_ADDON003"],
--   "pricing_rules": [
--     {
--       "id": "rule-001",
--       "label": "Upgrade para Enterprise",
--       "condition": { "step_id": "s2", "operator": "eq", "value": "enterprise" },
--       "action":    { "type": "replace", "price_id": "price_ENT003",
--                      "label": "Plano Enterprise", "amount": 299700 }
--     },
--     {
--       "id": "rule-002",
--       "label": "+ Add-on Suporte VIP",
--       "condition": { "step_id": "s3", "operator": "includes", "value": "suporte-vip" },
--       "action":    { "type": "add", "price_id": "price_ADDON001",
--                      "label": "+ Suporte Prioritário", "amount": 99700 }
--     }
--   ],
--   "success_url":  "https://app.bridge.com/obrigado",
--   "cancel_url":   "https://app.bridge.com/cancelado"
-- }
-- ============================================================

create table if not exists bridge_forms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  schema      jsonb not null default '{}'::jsonb,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger bridge_forms_updated_at
  before update on bridge_forms
  for each row execute procedure update_updated_at();

-- Update bridge_leads to reference forms
alter table bridge_leads
  add column if not exists form_id uuid references bridge_forms(id) on delete set null;

create index if not exists idx_bridge_forms_slug on bridge_forms(slug);

-- RLS
alter table bridge_forms enable row level security;

create policy "public reads active forms"
  on bridge_forms for select
  using (active = true);

create policy "service role full access on bridge_forms"
  on bridge_forms for all
  using (auth.role() = 'service_role');

-- ── Seed form for local dev ───────────────────────────────────
insert into bridge_forms (name, slug, schema) values (
  'Aplicação Bridge Enterprise',
  'bridge-enterprise',
  '{
    "steps": [
      {
        "id": "s-email",
        "question": "Qual é o seu e-mail profissional?",
        "type": "email",
        "field": "email",
        "required": true,
        "placeholder": "voce@empresa.com",
        "nextStep": "s-name"
      },
      {
        "id": "s-name",
        "question": "Como você se chama?",
        "type": "text",
        "field": "name",
        "required": true,
        "placeholder": "Seu nome completo",
        "nextStep": "s-company-size"
      },
      {
        "id": "s-company-size",
        "question": "Qual é o tamanho da sua empresa?",
        "type": "select",
        "field": "company_size",
        "required": true,
        "options": [
          { "value": "solo",       "label": "Só eu mesmo",           "nextStep": "s-goal" },
          { "value": "pequena",    "label": "2 – 20 pessoas",        "nextStep": "s-goal" },
          { "value": "media",      "label": "21 – 200 pessoas",      "nextStep": "s-goal" },
          { "value": "enterprise", "label": "+200 pessoas",          "nextStep": "s-goal" }
        ]
      },
      {
        "id": "s-goal",
        "question": "Qual é o seu principal objetivo com Bridge?",
        "type": "select",
        "field": "goal",
        "required": true,
        "options": [
          { "value": "lancamentos",  "label": "Lançar produtos digitais",  "nextStep": "s-addons" },
          { "value": "captacao",     "label": "Captar leads qualificados",  "nextStep": "s-addons" },
          { "value": "vendas",       "label": "Aumentar conversão de vendas","nextStep": "s-addons" }
        ]
      },
      {
        "id": "s-addons",
        "question": "Quais recursos adicionais te interessam?",
        "type": "multiselect",
        "field": "addons",
        "required": false,
        "nextStep": "__checkout__",
        "options": [
          { "value": "suporte-vip",    "label": "Suporte Prioritário 24/7",    "nextStep": "__checkout__" },
          { "value": "onboarding",     "label": "Onboarding Dedicado",          "nextStep": "__checkout__" },
          { "value": "relatorios-bi",  "label": "Relatórios BI Avançados",      "nextStep": "__checkout__" }
        ]
      }
    ],
    "default_price_id": "price_BASE_PLACEHOLDER",
    "default_label":    "Plano Bridge Essencial",
    "default_amount":   49700,
    "allowed_price_ids": [
      "price_BASE_PLACEHOLDER",
      "price_ENT_PLACEHOLDER",
      "price_ADDON_VIP",
      "price_ADDON_OB",
      "price_ADDON_BI"
    ],
    "pricing_rules": [
      {
        "id": "rule-enterprise",
        "label": "Upgrade Enterprise",
        "condition": { "step_id": "s-company-size", "operator": "eq", "value": "enterprise" },
        "action":    { "type": "replace", "price_id": "price_ENT_PLACEHOLDER",
                       "label": "Plano Bridge Enterprise", "amount": 299700 }
      },
      {
        "id": "rule-addon-vip",
        "label": "+ Suporte VIP",
        "condition": { "step_id": "s-addons", "operator": "includes", "value": "suporte-vip" },
        "action":    { "type": "add", "price_id": "price_ADDON_VIP",
                       "label": "+ Suporte Prioritário 24/7", "amount": 99700 }
      },
      {
        "id": "rule-addon-onboarding",
        "label": "+ Onboarding",
        "condition": { "step_id": "s-addons", "operator": "includes", "value": "onboarding" },
        "action":    { "type": "add", "price_id": "price_ADDON_OB",
                       "label": "+ Onboarding Dedicado", "amount": 149700 }
      },
      {
        "id": "rule-addon-bi",
        "label": "+ BI Avançado",
        "condition": { "step_id": "s-addons", "operator": "includes", "value": "relatorios-bi" },
        "action":    { "type": "add", "price_id": "price_ADDON_BI",
                       "label": "+ Relatórios BI Avançados", "amount": 79700 }
      }
    ],
    "success_url": "http://localhost:5173/obrigado",
    "cancel_url":  "http://localhost:5173/apply"
  }'::jsonb
) on conflict (slug) do nothing;
