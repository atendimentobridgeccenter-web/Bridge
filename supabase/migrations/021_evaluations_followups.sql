-- 021_evaluations_followups.sql
-- Fase 2 — Pipeline comercial: avaliação e follow-ups.
--
-- Cobre as etapas 2, 3 e 4 do fluxo: comercial agenda a avaliação, especialista
-- registra o resultado indicando a turma cabível, e o time dispara os follow-ups
-- até converter a matrícula.
--
-- Chave de vínculo: contact_key, a mesma de contact_stages (lower(email) ou
-- telefone). É o contato que agrupa as várias inscrições de uma mesma pessoa —
-- pendurar a avaliação num único preenchimento duplicaria o histórico de quem
-- preencheu dois formulários. lead_id fica guardado à parte, para rastreio.
--
-- O link do Meet aqui é texto preenchido à mão. A geração automática pelo Google
-- Calendar é a Fase 3, e entra preenchendo esta mesma coluna — então nada do que
-- for cadastrado agora se perde quando a automação chegar.

-- ── Novos estágios do pipeline ────────────────────────────────
-- Os cinco valores originais permanecem: remover algum invalidaria as linhas que
-- já existem. 'proposta' continua aceito mesmo com 'follow_up' cobrindo melhor a
-- etapa, porque há contatos parados nele hoje.
alter table public.contact_stages
  drop constraint if exists contact_stages_stage_check;

alter table public.contact_stages
  add constraint contact_stages_stage_check check (stage in (
    'novo',
    'em_contato',
    'avaliacao_agendada',
    'avaliacao_feita',
    'follow_up',
    'proposta',
    'fechado',
    'perdido'
  ));

-- ── Avaliações ────────────────────────────────────────────────
create table if not exists public.evaluations (
  id                    uuid        primary key default gen_random_uuid(),
  contact_key           text        not null,
  lead_id               uuid        references public.leads(id)    on delete set null,

  -- Agendamento
  scheduled_at          timestamptz,
  duration_minutes      smallint    default 60
                                    check (duration_minutes is null or duration_minutes > 0),
  specialist_teacher_id uuid        references public.teachers(id) on delete set null,
  meet_link             text,

  -- Resultado
  status                text        not null default 'agendada'
                                    check (status in ('agendada', 'realizada', 'cancelada', 'nao_compareceu')),
  outcome_note          text,
  recommended_class_id  uuid        references public.classes(id)  on delete set null,
  recommended_level     text        check (recommended_level in ('N5', 'N4', 'N3', 'N2', 'N1')),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid        references auth.users(id)
);

-- ── Follow-ups ────────────────────────────────────────────────
-- seq ordena a sequência; a quantidade é livre, o time cria quantos precisar.
-- evaluation_id é opcional: dá para fazer follow-up de quem nunca foi avaliado.
create table if not exists public.follow_ups (
  id             uuid        primary key default gen_random_uuid(),
  contact_key    text        not null,
  evaluation_id  uuid        references public.evaluations(id) on delete set null,
  seq            smallint    not null default 1,
  due_at         timestamptz,
  done_at        timestamptz,
  channel        text        check (channel in ('whatsapp', 'ligacao', 'email', 'presencial', 'outro')),
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid        references auth.users(id)
);

-- ── updated_at automático (função criada na 014) ───────────────
drop trigger if exists evaluations_updated_at on public.evaluations;
create trigger evaluations_updated_at
  before update on public.evaluations
  for each row execute function public.set_updated_at();

drop trigger if exists follow_ups_updated_at on public.follow_ups;
create trigger follow_ups_updated_at
  before update on public.follow_ups
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
alter table public.evaluations enable row level security;
alter table public.follow_ups  enable row level security;

drop policy if exists "admin_evaluations" on public.evaluations;
create policy "admin_evaluations" on public.evaluations
  for all to authenticated
  using      ((auth.jwt()->'app_metadata'->>'role') = 'admin' or auth.role() = 'service_role')
  with check ((auth.jwt()->'app_metadata'->>'role') = 'admin' or auth.role() = 'service_role');

drop policy if exists "admin_follow_ups" on public.follow_ups;
create policy "admin_follow_ups" on public.follow_ups
  for all to authenticated
  using      ((auth.jwt()->'app_metadata'->>'role') = 'admin' or auth.role() = 'service_role')
  with check ((auth.jwt()->'app_metadata'->>'role') = 'admin' or auth.role() = 'service_role');

-- ── Índices ───────────────────────────────────────────────────
create index if not exists evaluations_contact_key_idx  on public.evaluations (contact_key);
create index if not exists evaluations_scheduled_at_idx on public.evaluations (scheduled_at desc);
create index if not exists evaluations_status_idx       on public.evaluations (status);
create index if not exists evaluations_class_idx        on public.evaluations (recommended_class_id);
create index if not exists follow_ups_contact_key_idx   on public.follow_ups (contact_key);
-- Pendências ordenadas por vencimento: a consulta do painel é
-- "done_at is null order by due_at".
create index if not exists follow_ups_pending_idx       on public.follow_ups (due_at) where done_at is null;
