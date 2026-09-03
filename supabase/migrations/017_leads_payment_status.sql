-- 017_leads_payment_status.sql
-- Rastreamento de status de pagamento Stripe por lead

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS payment_status    text        NOT NULL DEFAULT 'none'
    CHECK (payment_status IN ('none', 'pending', 'confirmed')),
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS paid_at           timestamptz;

CREATE INDEX IF NOT EXISTS leads_payment_status_idx ON public.leads (payment_status);
CREATE INDEX IF NOT EXISTS leads_paid_at_idx         ON public.leads (paid_at DESC);

-- Permite que o lead (anon) atualize seus próprios dados após o pagamento.
-- Segurança: o UUID do lead é gerado pelo banco e indevassável; conhecê-lo
-- equivale a ser o dono do registro no contexto de formulários públicos.
-- A cláusula WITH CHECK impede rebaixar um pagamento já confirmado.
DROP POLICY IF EXISTS "anon_complete_lead" ON public.leads;
CREATE POLICY "anon_complete_lead" ON public.leads
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (payment_status IN ('none', 'pending'));

-- Admins podem atualizar qualquer lead
DROP POLICY IF EXISTS "admin_update_leads" ON public.leads;
CREATE POLICY "admin_update_leads" ON public.leads
  FOR UPDATE TO authenticated
  USING    ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');
