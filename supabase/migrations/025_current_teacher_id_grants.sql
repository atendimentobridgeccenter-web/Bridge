-- 025_current_teacher_id_grants.sql
-- Fecha o EXECUTE de current_teacher_id() para o anon.
--
-- A 024 fez `revoke all ... from public` e `grant execute to authenticated`, mas
-- o anon continuou com EXECUTE: o Supabase concede privilégios padrão para anon
-- e authenticated em funções novas do schema public, e esses grants são
-- individuais — revogar de PUBLIC não os alcança.
--
-- Não havia vazamento: para o anon, auth.uid() é nulo, nenhuma linha de teachers
-- casa com auth_user_id nulo, e a função devolve nulo. Isto é fechar a porta que
-- já estava sem nada atrás, porque uma função SECURITY DEFINER não deveria ser
-- invocável por quem nunca tem motivo para chamá-la.

revoke execute on function public.current_teacher_id() from anon;
