-- 022_enrollment_draft.sql
-- Fase 4 — Matrícula: a ficha nasce sozinha quando o pagamento é confirmado.
--
-- Por que gatilho e não Edge Function: o pagamento é confirmado em DOIS caminhos
-- independentes — o webhook do Stripe (service_role) e o frontend no retorno do
-- checkout (anon). Um gatilho na tabela cobre os dois de uma vez; uma função
-- exigiria duplicar a regra nos dois lugares, com as duas cópias divergindo com
-- o tempo.
--
-- Por que rascunho e não ficha ativa: alocar turma e fechar mensalidade são
-- decisões do time, não do formulário. O rascunho mata a digitação sem tirar a
-- conferência de quem entra na escola. Rascunho também não ocupa vaga, porque a
-- contagem de ocupação só considera status 'ativo'.

-- ── Novo status: rascunho ─────────────────────────────────────
alter table public.students
  drop constraint if exists students_status_check;

alter table public.students
  add constraint students_status_check check (status in (
    'rascunho',
    'ativo',
    'trancado',
    'cancelado'
  ));

-- ── Criação do rascunho ───────────────────────────────────────
-- SECURITY DEFINER é necessário: no caminho do frontend quem atualiza o lead é o
-- anon, que não tem (e não deve ter) permissão de escrever em students.
-- search_path fixo para a função não resolver nomes por schema de quem chama.
--
-- Mapeia só as colunas fixas do lead. As respostas do formulário vivem em
-- answers com IDs de nó como chave (bskkeyu, e0peakt…), que variam por
-- formulário — não há como mapeá-las sem um "campo de destino" configurado em
-- cada pergunta no construtor. O time completa o resto a partir do card do lead.
create or replace function public.create_student_draft_from_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Idempotente: um rascunho por lead, mesmo que a confirmação chegue duas vezes
  -- (webhook e frontend costumam correr juntos no retorno do checkout).
  if exists (select 1 from public.students where lead_id = new.id) then
    return new;
  end if;

  insert into public.students (
    lead_id,
    student_name,
    email,
    phone_responsible,
    address,
    payment_method,
    start_date,
    status
  ) values (
    new.id,
    -- student_name é NOT NULL: sem nome no lead, entra um marcador visível em
    -- vez de barrar a confirmação do pagamento.
    coalesce(nullif(trim(new.name), ''), 'Sem nome — revisar'),
    nullif(trim(new.email), ''),
    nullif(trim(new.phone), ''),
    nullif(trim(new.city), ''),
    case when new.stripe_session_id is not null then 'stripe' end,
    current_date,
    'rascunho'
  );

  return new;
end $$;

drop trigger if exists leads_confirmed_creates_student on public.leads;
create trigger leads_confirmed_creates_student
  after update of payment_status on public.leads
  for each row
  when (new.payment_status = 'confirmed' and old.payment_status is distinct from 'confirmed')
  execute function public.create_student_draft_from_lead();

-- Sem backfill: os 131 leads existentes estão todos com payment_status 'none',
-- nenhum pagamento foi confirmado até aqui. O gatilho vale daqui para frente.

create index if not exists students_status_rascunho_idx
  on public.students (created_at desc) where status = 'rascunho';
