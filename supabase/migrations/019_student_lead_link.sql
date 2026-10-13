-- 019_student_lead_link.sql
-- Fase 0 — Fundação de identidade.
--
-- Liga a ficha do aluno à inscrição que a originou. Sem esse vínculo o pipeline
-- comercial (contact_stages, indexado por string de email/telefone) e o cadastro
-- de alunos são dois mundos separados — o que impede o histórico do aluno, a
-- criação automática da ficha e o controle de matrícula.
--
-- ON DELETE SET NULL (e não CASCADE): remover um lead nunca pode apagar a ficha
-- de um aluno matriculado.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS lead_id      uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deposit_name text;

CREATE INDEX IF NOT EXISTS students_lead_id_idx ON public.students (lead_id);

-- Backfill do vínculo para as fichas que já existem.
-- Quando a mesma pessoa preencheu vários formulários, vence o lead mais antigo:
-- é ele que representa a origem da matrícula. Só preenche quem está NULL, então
-- rodar de novo não sobrescreve vínculo algum.
UPDATE public.students s
SET lead_id = origem.lead_id
FROM (
  SELECT DISTINCT ON (lower(trim(l.email)))
         lower(trim(l.email)) AS email_key,
         l.id                 AS lead_id
  FROM public.leads l
  WHERE l.email IS NOT NULL AND trim(l.email) <> ''
  ORDER BY lower(trim(l.email)), l.created_at ASC
) origem
WHERE s.lead_id IS NULL
  AND s.email IS NOT NULL
  AND lower(trim(s.email)) = origem.email_key;

-- deposit_name fica NULL de propósito: o nome do depositante pode ser de um
-- terceiro (avô, empresa), então herdar responsible_name aqui inventaria dado.
-- A interface oferece o nome do responsável como sugestão no preenchimento.
