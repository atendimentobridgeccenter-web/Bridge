-- 027_class_sessions_and_product.sql
-- Encontros semanais variáveis por turma, e vínculo da turma com o produto.
--
-- Decisão do Everton (2026-10-12):
--   "Turma tem um ou dois encontros por semana? Isso fica personalizado, são
--    vários produtos diferentes."
--   "Um produto corresponde a uma turma ou a um conjunto? Um conjunto."
--
-- O modelo anterior tinha weekday/time_start/time_end direto em classes, o que
-- fixava um encontro por semana. Produtos diferentes têm grades diferentes, então
-- os encontros passam a ser linhas próprias.
--
-- As colunas antigas em classes permanecem no banco — nada é apagado. Elas só
-- saem de uso pela interface, como já aconteceu com class_schedule e teacher.

-- ── Encontros semanais ────────────────────────────────────────
-- CASCADE em class_id é deliberado: um encontro não existe sem a turma. Deixar
-- encontros órfãos apontando para turma inexistente seria pior que removê-los
-- junto. Mesmo critério usado em grades.student_id.
create table if not exists public.class_sessions (
  id          uuid        primary key default gen_random_uuid(),
  class_id    uuid        not null references public.classes(id) on delete cascade,
  weekday     smallint    not null check (weekday between 0 and 6),
  time_start  time,
  time_end    time,
  created_at  timestamptz not null default now(),

  -- Mesma turma não repete o mesmo dia e horário: seria encontro duplicado na
  -- grade, e a interface mostraria a linha duas vezes.
  constraint class_sessions_unique_slot unique (class_id, weekday, time_start)
);

-- ── Produto da turma ──────────────────────────────────────────
-- Um produto reúne várias turmas (um conjunto). SET NULL: arquivar um produto
-- não pode apagar turmas com alunos matriculados.
alter table public.classes
  add column if not exists product_id uuid references public.products(id) on delete set null;

-- ── Migra o encontro único que estiver em classes ─────────────
-- Hoje classes está vazia, então isto não move nada. Fica porque a migration
-- precisa ser correta se rodar em outro ambiente que já tenha turmas.
insert into public.class_sessions (class_id, weekday, time_start, time_end)
select c.id, c.weekday, c.time_start, c.time_end
from public.classes c
where c.weekday is not null
  and not exists (select 1 from public.class_sessions s where s.class_id = c.id)
on conflict do nothing;

-- ── RLS ───────────────────────────────────────────────────────
-- Espelha classes: admin vê tudo, professor vê os encontros das próprias turmas.
alter table public.class_sessions enable row level security;

drop policy if exists "admin_class_sessions" on public.class_sessions;
create policy "admin_class_sessions" on public.class_sessions
  for all to authenticated
  using      ((auth.jwt()->'app_metadata'->>'role') = 'admin' or auth.role() = 'service_role')
  with check ((auth.jwt()->'app_metadata'->>'role') = 'admin' or auth.role() = 'service_role');

drop policy if exists "teacher_reads_own_class_sessions" on public.class_sessions;
create policy "teacher_reads_own_class_sessions" on public.class_sessions
  for select to authenticated
  using (
    class_id in (
      select id from public.classes where teacher_id = public.current_teacher_id()
    )
  );

create index if not exists class_sessions_class_idx    on public.class_sessions (class_id);
create index if not exists class_sessions_schedule_idx on public.class_sessions (weekday, time_start);
create index if not exists classes_product_idx         on public.classes (product_id);
