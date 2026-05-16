-- ============================================================
-- BRIDGE: Webhook Idempotency Table
-- ============================================================
--
-- Objetivo:
--   Evitar que o Stripe processe o mesmo evento duas vezes.
--   O Stripe envia retentativas automáticas quando recebe 5xx
--   ou timeout. Sem idempotência, isso causa:
--     - Criação duplicada de usuários
--     - Grants de acesso duplicados
--     - Magic links duplicados enviados ao cliente
--
-- Garantia:
--   Um evento SÓ é inserido aqui DEPOIS que user_access foi
--   concedido com sucesso. Se qualquer step anterior falhar,
--   o evento não é registado e o Stripe pode re-tentar.
--
-- Constraint PK:
--   stripe_event_id é PRIMARY KEY — o banco rejeita INSERTs
--   duplicados com violação de chave primária (23505).
--   A Edge Function trata esse código para retornar 200 ao
--   Stripe (sem re-processar) quando detecta retry legítimo.
-- ============================================================

create table if not exists stripe_events (
  stripe_event_id  text        not null,
  type             text        not null,
  payload          jsonb       not null default '{}',
  processed_at     timestamptz not null default now(),

  constraint stripe_events_pkey primary key (stripe_event_id)
);

-- Index para consultas de auditoria por tipo de evento
create index if not exists idx_stripe_events_type
  on stripe_events(type);

-- Index para consultas de auditoria por data
create index if not exists idx_stripe_events_processed_at
  on stripe_events(processed_at desc);

-- RLS: apenas service_role pode ler/escrever
alter table stripe_events enable row level security;

create policy "service role only on stripe_events"
  on stripe_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Comentário de auditoria
comment on table stripe_events is
  'Registo de eventos Stripe processados com sucesso. Garante idempotência do webhook — um evento só é inserido após o acesso ao produto ser efectivamente concedido.';
