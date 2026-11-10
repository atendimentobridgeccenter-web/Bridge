-- 030_lock_admin_role.sql
-- Fecha a escalada para admin e fixa o search_path de is_admin().
-- Origem: OS-001 (auditoria 2026-11-09, Crítico 1 + Médio 7).
--
-- O QUE FAZ
--   1. Remove public.set_admin_role(uuid).
--   2. Recria public.is_admin() com `set search_path = ''`, mesmo corpo e mesmo
--      comportamento (continua SECURITY DEFINER, STABLE, retorna boolean).
--
-- POR QUÊ
--   set_admin_role (003 e 006) é SECURITY DEFINER, grava role=admin em
--   auth.users e não confere quem chama. No Supabase, funções do schema public
--   recebem EXECUTE para anon e authenticated (ver 025), então qualquer conta
--   conseguia virar admin com POST /rest/v1/rpc/set_admin_role. Nada no front,
--   nas Edge Functions, em policies ou triggers usa a função: removê-la é seguro
--   e elimina a superfície por completo (melhor que só revogar o EXECUTE, que
--   poderia ser desfeito por um grant futuro).
--
--   is_admin() é SECURITY DEFINER sem search_path fixo. O corpo só usa
--   auth.jwt(), já qualificado, então `search_path = ''` não muda o resultado.
--   Usa `create or replace` (não drop) porque as policies de products,
--   product_structure, user_access e bridge_leads dependem dela. NÃO há revoke
--   em is_admin(): a policy de leitura de products é avaliada também para anon
--   (landing pages públicas) e quebraria com "permission denied for function".
--
-- COMO PROMOVER UM ADMIN DAQUI EM DIANTE (só pelo SQL Editor do Supabase)
--   update auth.users
--      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--    where id = '<uuid>';
--   O usuário precisa sair e entrar de novo para o JWT refletir o papel.
--
-- CONFERÊNCIA PÓS-APLICAÇÃO
--   -- set_admin_role removida (esperado: true)
--   select to_regprocedure('public.set_admin_role(uuid)') is null as removida;
--
--   -- search_path fixo em is_admin (esperado: {search_path=""})
--   select proconfig from pg_proc where oid = 'public.is_admin()'::regprocedure;
--
--   -- is_admin continua executável por anon e authenticated (esperado: true, true)
--   select has_function_privilege('anon', 'public.is_admin()', 'execute') as anon_exec,
--          has_function_privilege('authenticated', 'public.is_admin()', 'execute') as auth_exec;
--
--   -- admins atuais (revisar e rebaixar quem não for da equipe)
--   select id, email, raw_app_meta_data->>'role' as role, created_at
--     from auth.users
--    where raw_app_meta_data->>'role' = 'admin';

-- ── 1. Remove a função de escalada ───────────────────────────
drop function if exists public.set_admin_role(uuid);

-- ── 2. is_admin() com search_path fixo (mesmo comportamento) ──
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  )
$$;
