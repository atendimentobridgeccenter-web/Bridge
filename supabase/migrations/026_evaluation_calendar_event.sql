-- 026_evaluation_calendar_event.sql
-- Fase 3 — Referência do evento no Google Calendar.
--
-- Guardar o id do evento é o que permite reagendar e cancelar depois sem criar
-- um evento duplicado a cada salvamento. Sem ele, mudar a data da avaliação
-- deixaria o convite antigo de pé no calendário de todos os convidados.

alter table public.evaluations
  add column if not exists calendar_event_id text,
  add column if not exists meet_generated_at timestamptz;

-- Um evento do Calendar pertence a uma avaliação só: índice único evita que uma
-- falha parcial na Edge Function deixe duas avaliações apontando para o mesmo
-- convite e uma sobrescrevendo a outra.
create unique index if not exists evaluations_calendar_event_id_key
  on public.evaluations (calendar_event_id) where calendar_event_id is not null;
