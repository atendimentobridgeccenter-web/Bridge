-- 023_grades.sql
-- Fase 6 — Notas do aluno.
--
-- A tabela entra aqui, e não junto com o portal do professor, porque o histórico
-- do aluno precisa exibir notas desde já. O portal da Fase 5 só acrescenta o
-- escopo de acesso: o professor passa a ver e lançar apenas nas turmas que são
-- dele. O modelo de dados não muda por causa disso.
--
-- class_id guarda em qual turma a nota foi lançada. É redundante com
-- students.class_id hoje, mas deixa de ser no primeiro remanejamento: a nota tem
-- de continuar apontando para a turma onde a avaliação aconteceu, não para a
-- turma em que o aluno está agora.

create table if not exists public.grades (
  id            uuid        primary key default gen_random_uuid(),
  student_id    uuid        not null references public.students(id) on delete cascade,
  class_id      uuid        references public.classes(id)  on delete set null,
  teacher_id    uuid        references public.teachers(id) on delete set null,

  title         text        not null,
  score         numeric(6,2),
  max_score     numeric(6,2) default 100
                            check (max_score is null or max_score > 0),
  assessed_on   date        not null default current_date,
  note          text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid        references auth.users(id)
);

-- CASCADE em student_id é deliberado e é a única exceção ao padrão da base:
-- nota é parte da ficha, não entidade própria. Apagar a ficha e deixar notas
-- órfãs apontando para um aluno inexistente seria pior que removê-las junto.

drop trigger if exists grades_updated_at on public.grades;
create trigger grades_updated_at
  before update on public.grades
  for each row execute function public.set_updated_at();

alter table public.grades enable row level security;

drop policy if exists "admin_grades" on public.grades;
create policy "admin_grades" on public.grades
  for all to authenticated
  using      ((auth.jwt()->'app_metadata'->>'role') = 'admin' or auth.role() = 'service_role')
  with check ((auth.jwt()->'app_metadata'->>'role') = 'admin' or auth.role() = 'service_role');

create index if not exists grades_student_idx on public.grades (student_id, assessed_on desc);
create index if not exists grades_class_idx   on public.grades (class_id);
create index if not exists grades_teacher_idx on public.grades (teacher_id);
