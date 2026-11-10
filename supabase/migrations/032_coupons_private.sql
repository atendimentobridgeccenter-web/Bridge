-- 032_coupons_private.sql
-- Fecha a leitura pública de cupons e cria uma RPC para validar um código por
-- vez. Origem: OS-006 (auditoria 2026-11-09, Alto 4, lado de banco).
--
-- O QUE FAZ
--   1. Remove "anyone_select_coupons" (010): deixava qualquer visitante baixar
--      a tabela coupons inteira — códigos ativos e inativos, valores, limites.
--   2. Cria "admin_select_coupons": só quem é admin lê a tabela direto (a 010
--      nunca teve policy de SELECT para admin — só INSERT/UPDATE/DELETE —
--      e o admin dependia da policy pública para listar em CuponsPage e
--      SettingsPage).
--   3. Cria a RPC public.validate_coupon(p_code text), que devolve uma linha
--      só se o código estiver ativo, não expirado e dentro do limite de uso;
--      senão, zero linhas. É o único uso público hoje (QuizzRunner, nó de
--      depósito bancário) — e passa a ser o único caminho.
--
-- POR QUÊ
--   Cupom de desconto alto, uma vez encontrado na tabela pública, é usado e
--   divulgado. O front (QuizzRunner.tsx:815-819) só precisa saber se UM código
--   digitado é válido e quanto desconta — nunca precisou da tabela inteira.
--
-- RISCO CONSIDERADO: RPC virar enumerador de códigos
--   validate_coupon é SECURITY DEFINER, STABLE, com search_path fixo (''),
--   nomes qualificados (public.coupons). A entrada é normalizada com
--   upper(trim(p_code)) — mesma normalização que o front já faz
--   (QuizzRunner.tsx:809, trim().toUpperCase()) — e comparada por IGUALDADE
--   (nunca LIKE/ILIKE, que permitiria varrer códigos por tentativa), com
--   LIMIT 1. REVOKE ALL FROM PUBLIC fecha o default do Postgres; GRANT EXECUTE
--   só para anon e authenticated, que são quem de fato usa (formulário
--   público e usuário logado preenchendo o mesmo formulário).
--
-- NÃO FAZ (fora de escopo desta OS)
--   - Não altera o QuizzRunner (é a OS-007, do OP-01, que troca a leitura
--     direta da tabela por esta RPC).
--   - Não incrementa uses_count (achado fora de escopo, ver relatório da OS).
--   - Não mexe em cupons do Stripe nem no sync-stripe-product.
--
-- CONFERÊNCIA PÓS-APLICAÇÃO
--   -- policies de coupons (esperado: sem "anyone_select_coupons"; com
--   -- "admin_select_coupons" e as três de admin_insert/update/delete_coupons)
--   select policyname, cmd, roles from pg_policies where tablename = 'coupons';
--
--   -- código que não existe → vazio
--   select * from public.validate_coupon('NAOEXISTE');
--
--   -- anon e authenticated conseguem chamar a RPC (esperado: true, true)
--   select has_function_privilege('anon','public.validate_coupon(text)','execute') as anon_exec,
--          has_function_privilege('authenticated','public.validate_coupon(text)','execute') as auth_exec;
--
--   -- ninguém além de anon/authenticated tem EXECUTE (esperado: 0 linhas)
--   select grantee from information_schema.routine_privileges
--    where routine_name = 'validate_coupon' and grantee not in ('anon','authenticated','postgres','service_role');

-- ── 1. Admin lê a tabela direto (não existia antes) ──────────────
--    Criada ANTES do drop da policy pública (mesma migration/transação),
--    para nunca existir um instante sem nenhuma policy de SELECT.
drop policy if exists "admin_select_coupons" on public.coupons;
create policy "admin_select_coupons" on public.coupons
  for select
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ── 2. Remove a leitura pública da tabela ────────────────────────
drop policy if exists "anyone_select_coupons" on public.coupons;

-- ── 3. RPC pública: valida um código, nunca lista ─────────────────
create or replace function public.validate_coupon(p_code text)
returns table (
  code           text,
  discount_type  text,
  discount_value numeric,
  applies_to     text
)
language sql
security definer
stable
set search_path = ''
as $$
  select c.code, c.discount_type, c.discount_value, c.applies_to
    from public.coupons c
   where c.code = upper(trim(p_code))
     and c.active = true
     and (c.expires_at is null or c.expires_at > now())
     and (c.max_uses is null or c.uses_count < c.max_uses)
   limit 1
$$;

revoke all on function public.validate_coupon(text) from public;
grant execute on function public.validate_coupon(text) to anon, authenticated;
