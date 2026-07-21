-- 014_students.sql
-- Cadastro completo de alunos (separado dos leads de captação)

create table if not exists public.students (
  id                 uuid        primary key default gen_random_uuid(),

  -- Dados pessoais
  student_name       text        not null,
  responsible_name   text,
  birth_date         date,
  phone_responsible  text,
  phone_student      text,
  email              text,
  address            text,

  -- Aulas
  start_date         date,
  subject            text        check (subject in ('jlpt','refesco','ingles')),
  jlpt_level         text        check (jlpt_level in ('N5','N4','N3','N2','N1')),
  school_year        text,
  pocket_id          text,
  class_schedule     text,
  teacher            text,
  modality           text        check (modality in ('presencial','online')),
  unit               text,
  meet_link          text,
  classroom_link     text,

  -- Financeiro
  monthly_fee        numeric(10,2),
  payment_method     text        check (payment_method in ('deposito','dinheiro','stripe')),
  discount_notes     text,
  notes              text,

  -- Status
  status             text        not null default 'ativo'
                                 check (status in ('ativo','trancado','cancelado')),
  lock_start         date,
  lock_end           date,
  cancel_date        date,
  cancel_reason      text        check (cancel_reason in (
                                   'financeiro','horario','mudanca',
                                   'desistencia','nao_identificado','outro'
                                 )),

  -- Documento
  termo_url          text,

  -- Meta
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid        references auth.users(id)
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger students_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

-- RLS
alter table public.students enable row level security;

create policy "admin_students" on public.students
  for all to authenticated
  using    ((auth.jwt()->'app_metadata'->>'role')='admin' or auth.role()='service_role')
  with check ((auth.jwt()->'app_metadata'->>'role')='admin' or auth.role()='service_role');

-- Indexes
create index if not exists students_status_idx       on public.students (status);
create index if not exists students_student_name_idx on public.students (student_name);
create index if not exists students_start_date_idx   on public.students (start_date desc);
