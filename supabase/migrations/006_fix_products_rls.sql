-- ============================================================
-- BRIDGE: Emergency RLS Fix — products table
-- ============================================================
--
-- Problema raiz: is_admin() verifica app_metadata.role = 'admin'
-- no JWT. Se set_admin_role() nunca foi executado para o usuário
-- admin, todos os INSERTs e UPDATEs em products são bloqueados
-- com 403 silencioso — o cliente não recebe mensagem de erro útil.
--
-- EXECUTE APÓS RODAR ESTA MIGRATION:
--
--   SELECT set_admin_role('<uuid-do-seu-usuario>');
--
-- Para obter o UUID do seu usuário admin:
--   Supabase Dashboard → Authentication → Users → copie o "User UID"
--
-- ============================================================

-- ── 1. Garante que is_admin() está correta ────────────────────
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

-- ── 2. Substitui a política "for all" por políticas explícitas ─
-- PostgREST lida melhor com políticas separadas por operação.

drop policy if exists "admin full access on products"  on products;
drop policy if exists "admin_select_products"           on products;
drop policy if exists "admin_insert_products"           on products;
drop policy if exists "admin_update_products"           on products;
drop policy if exists "admin_delete_products"           on products;
drop policy if exists "public reads published products" on products;

create policy "admin_select_products"
  on products for select
  using (is_admin() or auth.role() = 'service_role' or status = 'published');

create policy "admin_insert_products"
  on products for insert
  with check (is_admin() or auth.role() = 'service_role');

create policy "admin_update_products"
  on products for update
  using    (is_admin() or auth.role() = 'service_role')
  with check (is_admin() or auth.role() = 'service_role');

create policy "admin_delete_products"
  on products for delete
  using (is_admin() or auth.role() = 'service_role');

-- ── 3. Garante set_admin_role() atualiza o campo correto ──────
create or replace function set_admin_role(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where id = target_user_id;
end;
$$;
