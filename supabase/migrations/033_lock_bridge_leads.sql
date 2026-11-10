-- 033_lock_bridge_leads.sql
-- Tranca a escrita pública na tabela legada `bridge_leads`. Origem: OS-008
-- (auditoria 2026-11-09, Alto 5, lado de banco).
--
-- O QUE FAZ
--   Remove as duas policies que deixavam qualquer visitante (anon e
--   authenticated, sem "to" nas policies originais) inserir e atualizar
--   linhas em bridge_leads: "anon inserts leads" e "anon updates own lead"
--   (001_launch_engine.sql:68-74, with check/using (true)).
--   Mantém intactas "admin reads all leads" (004_cleanup_legacy.sql) e
--   "service role full access on bridge_leads" — admin continua lendo,
--   service_role continua com acesso total.
--
-- POR QUÊ
--   bridge_leads é do fluxo antigo (FormRunner, formato "steps"). Em
--   produção ela tem 1 registro, o último de 16/05/2026 (consulta do
--   Everton em 09/11/2026); nenhum produto ativo está no formato antigo.
--   Decisão do cérebro: desligar e arquivar — os dados ficam (só leitura
--   do admin), a escrita pública acaba.
--
-- NÃO FAZ (fora de escopo desta OS)
--   - Não apaga a tabela nem os dados.
--   - Não mexe no front (FormRunner, Apply.tsx, telas mortas): é a OS-009,
--     do OP-01.
--
-- CONFERÊNCIA PÓS-APLICAÇÃO
--   select policyname, cmd from pg_policies where tablename = 'bridge_leads';
--   -- esperado: só "service role full access on bridge_leads" e
--   -- "admin reads all leads"

drop policy if exists "anon inserts leads" on public.bridge_leads;
drop policy if exists "anon updates own lead" on public.bridge_leads;

comment on table public.bridge_leads is
  'LEGADO — somente leitura desde 2026-11 (OS-008). Leads atuais em public.leads.';
