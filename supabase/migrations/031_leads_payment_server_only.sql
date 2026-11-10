-- 031_leads_payment_server_only.sql
-- Tira a confirmação de pagamento do navegador. Pagamento passa a ser
-- escrito só pelo servidor (service_role, no stripe-webhook-handler — OS-003).
-- Origem: OS-004 (auditoria 2026-11-09, Alto 3, lado de banco e função).
--
-- O QUE FAZ
--   1. Remove a policy "anon_complete_lead" (018): deixava qualquer visitante
--      dar UPDATE em leads e marcar payment_status = 'confirmed', o que pelo
--      gatilho da 022 criava aluno. Nenhuma policy de UPDATE para anon entra
--      no lugar — update de pagamento não é mais caminho do anon.
--   2. Recria "public_insert_leads" (007) para barrar INSERT de lead já "pago":
--      o WITH CHECK antigo era `true`. Agora exige payment_status = 'none',
--      paid_at nulo e stripe_session_id nulo.
--   3. Cria a RPC public.complete_lead_form(), SECURITY DEFINER, para o
--      formulário completar telefone/CPF/cidade/estado/respostas/qualificado
--      sem tocar em nenhuma coluna de pagamento.
--
-- POR QUÊ
--   O anon não tem SELECT em leads (só admin_select_leads), então o INSERT com
--   `.select('id').single()` do QuizzRunner falha inteiro (RETURNING exige
--   SELECT) e o erro é engolido em catch{}. Sem leadId, os UPDATEs seguintes
--   (phone/cpf/city/state/answers e o de payment_status=confirmed no retorno
--   do Stripe) não acham linha (`.eq('id', null)` nunca casa) e também somem
--   em handlers vazios. Ou seja: os dois caminhos que esta migration fecha já
--   não funcionam hoje — não há regressão para quem já paga.
--   A partir da OS-005 (OP-01, front), o create-checkout-session (OS-004) passa
--   a criar o lead 'pending' pela service_role e devolver o id; o formulário
--   chama complete_lead_form() com esse id para completar os dados; o webhook
--   (OS-003) confirma o pagamento. Até o deploy da OS-005, o INSERT sem
--   pagamento do QuizzRunner/FormRunner continua funcionando (não manda
--   nenhuma das três colunas de pagamento).
--
-- RISCO CONSIDERADO: RPC virar porta para ler/editar lead alheio
--   complete_lead_form é SECURITY DEFINER com search_path fixo ('') e nomes
--   totalmente qualificados (public.leads), RETURNS void (não devolve dado
--   nenhum do lead), atualiza só as 6 colunas do escopo, e só alcança lead
--   criado no último dia (`created_at > now() - interval '1 day'`) — um UUID
--   de lead velho encontrado por acaso não dá para reusar depois. REVOKE ALL
--   FROM PUBLIC fecha o default do Postgres; GRANT EXECUTE só para anon e
--   authenticated, que são quem de fato usa (formulário público e usuário
--   logado preenchendo o mesmo formulário).
--
-- CONFERÊNCIA PÓS-APLICAÇÃO
--   -- policies de leads (esperado: sem "anon_complete_lead"; public_insert_leads
--   -- com o novo with_check; admin_select_leads e admin_update_leads intactas)
--   select policyname, cmd, roles, with_check from pg_policies where tablename = 'leads';
--
--   -- anon e authenticated conseguem chamar a RPC (esperado: true, true)
--   select has_function_privilege('anon','public.complete_lead_form(uuid,text,text,text,text,jsonb,boolean)','execute') as anon_exec,
--          has_function_privilege('authenticated','public.complete_lead_form(uuid,text,text,text,text,jsonb,boolean)','execute') as auth_exec;
--
--   -- ninguém além de anon/authenticated tem EXECUTE (esperado: 0 linhas)
--   select grantee from information_schema.routine_privileges
--    where routine_name = 'complete_lead_form' and grantee not in ('anon','authenticated','postgres','service_role');

-- ── 1. Remove o UPDATE de pagamento do anon ──────────────────────
drop policy if exists "anon_complete_lead" on public.leads;

-- ── 2. INSERT público não pode mais nascer "pago" ────────────────
drop policy if exists "public_insert_leads" on public.leads;
create policy "public_insert_leads" on public.leads
  for insert
  to anon, authenticated
  with check (
    payment_status = 'none'
    and paid_at is null
    and stripe_session_id is null
  );

-- ── 3. RPC para o formulário completar o lead sem tocar em pagamento ─
-- Atualiza só phone, cpf, city, state, answers, qualified — nenhuma coluna de
-- pagamento é parâmetro, então não há como esta função confirmar nada.
create or replace function public.complete_lead_form(
  p_lead_id   uuid,
  p_phone     text,
  p_cpf       text,
  p_city      text,
  p_state     text,
  p_answers   jsonb,
  p_qualified boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.leads
     set phone     = nullif(trim(p_phone), ''),
         cpf       = nullif(trim(p_cpf), ''),
         city      = nullif(trim(p_city), ''),
         state     = nullif(trim(p_state), ''),
         answers   = coalesce(p_answers, '{}'::jsonb),
         qualified = p_qualified
   where id = p_lead_id
     and created_at > now() - interval '1 day';
end;
$$;

revoke all on function public.complete_lead_form(uuid, text, text, text, text, jsonb, boolean) from public;
grant execute on function public.complete_lead_form(uuid, text, text, text, text, jsonb, boolean) to anon, authenticated;
