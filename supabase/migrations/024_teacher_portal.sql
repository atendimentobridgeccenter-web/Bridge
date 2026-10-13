-- 024_teacher_portal.sql
-- Fase 5 — Portal do professor: vínculo com a conta e escopo de acesso.
--
-- REGRA DE SEGURANÇA DESTA MIGRATION: nenhuma política existente é removida ou
-- alterada. Políticas de RLS no Postgres são permissivas e combinam por OR, então
-- tudo aqui apenas ACRESCENTA acesso para o professor. As políticas de admin
-- continuam intactas — não há como esta migration trancar um administrador fora.
--
-- O papel vem de auth.jwt() -> app_metadata -> role, o mesmo mecanismo que o
-- admin já usa. app_metadata só é gravável pela service_role (nunca pelo próprio
-- usuário), então não é falsificável a partir do cliente.

-- ── Vínculo entre professor e conta de acesso ──────────────────
alter table public.teachers
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

-- Uma conta não pode responder por dois professores: o escopo de acesso ficaria
-- ambíguo e current_teacher_id() escolheria um arbitrariamente.
create unique index if not exists teachers_auth_user_id_key
  on public.teachers (auth_user_id) where auth_user_id is not null;

-- ── Qual professor é o usuário da sessão ───────────────────────
-- SECURITY DEFINER é necessário: a política de SELECT do professor sobre
-- teachers chama esta função, que lê teachers. Sem DEFINER a avaliação seria
-- recursiva. Rodando como dona da função, a leitura interna ignora RLS e a
-- recursão deixa de existir.
create or replace function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.teachers
  where auth_user_id = auth.uid() and status = 'ativo'
  limit 1
$$;

revoke all on function public.current_teacher_id() from public;
grant execute on function public.current_teacher_id() to authenticated;

-- ── Escopo do professor ───────────────────────────────────────

-- Vê a própria ficha de professor, e só ela.
drop policy if exists "teacher_reads_self" on public.teachers;
create policy "teacher_reads_self" on public.teachers
  for select to authenticated
  using (auth_user_id = auth.uid());

-- Vê as turmas em que é o responsável.
drop policy if exists "teacher_reads_own_classes" on public.classes;
create policy "teacher_reads_own_classes" on public.classes
  for select to authenticated
  using (teacher_id = public.current_teacher_id());

-- Vê os alunos das próprias turmas. Apenas leitura: alterar ficha de aluno
-- segue sendo da secretaria.
drop policy if exists "teacher_reads_own_students" on public.students;
create policy "teacher_reads_own_students" on public.students
  for select to authenticated
  using (
    class_id is not null
    and class_id in (
      select id from public.classes where teacher_id = public.current_teacher_id()
    )
  );

-- Lança e corrige notas das próprias turmas. O WITH CHECK impede lançar nota
-- numa turma de outro professor.
drop policy if exists "teacher_manages_own_grades" on public.grades;
create policy "teacher_manages_own_grades" on public.grades
  for all to authenticated
  using (
    class_id is not null
    and class_id in (
      select id from public.classes where teacher_id = public.current_teacher_id()
    )
  )
  with check (
    class_id is not null
    and class_id in (
      select id from public.classes where teacher_id = public.current_teacher_id()
    )
  );

create index if not exists classes_teacher_scope_idx on public.classes (teacher_id, status);

-- Para dar acesso a um professor, depois de criar o usuário no Auth:
--   1. definir app_metadata.role = 'professor' (via service_role ou dashboard)
--   2. gravar teachers.auth_user_id com o id desse usuário
-- Enquanto auth_user_id estiver nulo, current_teacher_id() devolve null e as
-- políticas acima não liberam linha alguma — o acesso é negado por omissão.
