-- 020_teachers_classes.sql
-- Fase 1 — Professores e Turmas como entidades.
--
-- Até aqui horário e professor eram texto solto em cada ficha de aluno, e a aba
-- "Turmas" era só um agrupamento desses textos feito em tempo de leitura. Isso
-- significava que mudar o horário de uma turma exigia editar cada ficha, uma por
-- uma, e um erro de digitação partia a turma em duas.
--
-- Com turma como registro próprio, a ficha aponta para ela e a edição passa a ser
-- num único lugar. É também a base do portal do professor (Fase 5) e do controle
-- de matrícula (Fase 4), que precisam de um professor e uma turma identificáveis.
--
-- Vagas ocupadas NÃO é coluna aqui: é contagem derivada de students.class_id com
-- status 'ativo'. Contador armazenado dessincroniza quando aluno entra, tranca,
-- cancela ou o ano letivo vira — derivar resolve os quatro casos de graça.

-- ── Professores ───────────────────────────────────────────────
create table if not exists public.teachers (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  email       text,
  phone       text,
  notes       text,
  status      text        not null default 'ativo'
                          check (status in ('ativo', 'inativo')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid        references auth.users(id)
);

-- ── Turmas ────────────────────────────────────────────────────
-- weekday segue a convenção do JavaScript: 0 = domingo … 6 = sábado.
-- Uma turma tem um encontro semanal, que é o padrão observado na operação
-- ("Quarta 19h"). Turma com dois encontros na semana pede uma tabela de
-- sessões — mudança aditiva, sem reescrever o que está aqui.
create table if not exists public.classes (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  subject         text        check (subject in ('jlpt', 'refesco', 'ingles')),
  jlpt_level      text        check (jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  teacher_id      uuid        references public.teachers(id) on delete set null,
  weekday         smallint    check (weekday between 0 and 6),
  time_start      time,
  time_end        time,
  modality        text        check (modality in ('presencial', 'online')),
  unit            text,
  meet_link       text,
  classroom_link  text,
  capacity        smallint    check (capacity is null or capacity > 0),
  school_year     text,
  notes           text,
  status          text        not null default 'ativa'
                              check (status in ('ativa', 'encerrada')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid        references auth.users(id)
);

-- ── Vínculo do aluno com a turma ──────────────────────────────
-- SET NULL (e não CASCADE): encerrar uma turma nunca pode apagar a ficha de um
-- aluno. O aluno fica sem turma e aparece para realocação.
--
-- As colunas de texto class_schedule e teacher permanecem na tabela de propósito:
-- nada é apagado. Elas só saem de uso pela interface, que passa a ler da turma.
alter table public.students
  add column if not exists class_id uuid references public.classes(id) on delete set null;

-- ── updated_at automático (função criada na 014) ───────────────
drop trigger if exists teachers_updated_at on public.teachers;
create trigger teachers_updated_at
  before update on public.teachers
  for each row execute function public.set_updated_at();

drop trigger if exists classes_updated_at on public.classes;
create trigger classes_updated_at
  before update on public.classes
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
-- Mesma política de students: admin e service_role. O escopo por professor
-- entra na Fase 5, junto com o portal e os papéis de equipe.
alter table public.teachers enable row level security;
alter table public.classes  enable row level security;

drop policy if exists "admin_teachers" on public.teachers;
create policy "admin_teachers" on public.teachers
  for all to authenticated
  using      ((auth.jwt()->'app_metadata'->>'role') = 'admin' or auth.role() = 'service_role')
  with check ((auth.jwt()->'app_metadata'->>'role') = 'admin' or auth.role() = 'service_role');

drop policy if exists "admin_classes" on public.classes;
create policy "admin_classes" on public.classes
  for all to authenticated
  using      ((auth.jwt()->'app_metadata'->>'role') = 'admin' or auth.role() = 'service_role')
  with check ((auth.jwt()->'app_metadata'->>'role') = 'admin' or auth.role() = 'service_role');

-- ── Índices ───────────────────────────────────────────────────
create index if not exists teachers_status_idx    on public.teachers (status);
create index if not exists teachers_name_idx      on public.teachers (name);
create index if not exists classes_teacher_id_idx on public.classes (teacher_id);
create index if not exists classes_status_idx     on public.classes (status);
create index if not exists classes_schedule_idx   on public.classes (weekday, time_start);
create index if not exists students_class_id_idx  on public.students (class_id);
