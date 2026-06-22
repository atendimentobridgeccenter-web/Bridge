-- 011_leads_utm.sql
-- Adiciona colunas de rastreamento UTM e referrer na tabela de leads

alter table public.leads
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term     text,
  add column if not exists utm_content  text,
  add column if not exists referrer     text;

create index if not exists leads_utm_source_idx on public.leads (utm_source);
