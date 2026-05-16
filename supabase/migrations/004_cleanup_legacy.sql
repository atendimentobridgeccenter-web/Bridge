-- ============================================================
-- BRIDGE: Cleanup Legacy bridge_forms System
-- ============================================================
--
-- Contexto:
--   O sistema legado usava bridge_forms para armazenar schemas
--   de formulários, com bridge_leads.form_id referenciando essa
--   tabela. A nova arquitetura centraliza tudo em `products`,
--   com o schema do formulário em products.form_logic_config.
--
-- Esta migration:
--   1. Adiciona product_id em bridge_leads (FK → products)
--   2. Remove a coluna form_id (FK → bridge_forms)
--   3. Remove a tabela bridge_forms (e o índice associado)
--
-- ATENÇÃO: Execute apenas após confirmar que nenhum dado de
--   bridge_leads.form_id precisa ser migrado para product_id.
--   Se houver leads históricos importantes, faça um UPDATE
--   manual antes de dropar a coluna.
-- ============================================================

-- ── 1. Adiciona product_id em bridge_leads ────────────────────
alter table bridge_leads
  add column if not exists product_id uuid
    references products(id) on delete set null;

create index if not exists idx_bridge_leads_product
  on bridge_leads(product_id);

-- ── 2. Remove a FK e coluna legada form_id ────────────────────
alter table bridge_leads
  drop column if exists form_id;

-- ── 3. Remove a tabela bridge_forms e seus objetos ────────────
drop index if exists idx_bridge_forms_slug;

drop table if exists bridge_forms cascade;

-- ── 4. Atualiza RLS de bridge_leads ───────────────────────────
-- Garante que admin pode ler todos os leads pelo product_id
-- (políticas existentes de anon insert/update permanecem)

drop policy if exists "admin reads all leads" on bridge_leads;

create policy "admin reads all leads"
  on bridge_leads for select
  using (is_admin() or auth.role() = 'service_role');
