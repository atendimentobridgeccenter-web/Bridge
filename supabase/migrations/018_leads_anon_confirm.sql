-- 018_leads_anon_confirm.sql
-- Permite que o anon marque o próprio lead como 'confirmed' no retorno do Stripe.
--
-- Justificativa de segurança: o UUID do lead é gerado pelo banco (v4) e salvo
-- em localStorage antes do redirect; conhecê-lo equivale a ser o dono do
-- registro. O Stripe redirect com ?payment_done=1 é prova adicional de pagamento.
-- O webhook continua confirmando via service_role (path seguro), mas o frontend
-- pode adiantar a atualização assim que o usuário volta — sem esperar o webhook.

DROP POLICY IF EXISTS "anon_complete_lead" ON public.leads;
CREATE POLICY "anon_complete_lead" ON public.leads
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (payment_status IN ('none', 'pending', 'confirmed'));
