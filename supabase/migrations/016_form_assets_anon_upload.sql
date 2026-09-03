-- ── Permitir upload anônimo de comprovantes ───────────────────
--
-- A política de INSERT criada em 009 exige autenticação (TO authenticated).
-- Leads preenchem o formulário sem login, portanto qualquer upload de
-- comprovante falhava com erro de RLS.
--
-- Esta migration adiciona uma política separada que permite ao papel
-- anon fazer INSERT apenas dentro da pasta receipts/, mantendo o
-- restante do bucket restrito a usuários autenticados.

DROP POLICY IF EXISTS "Anon users can upload receipts" ON storage.objects;

CREATE POLICY "Anon users can upload receipts"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'form-assets'
  AND (storage.foldername(name))[1] = 'receipts'
);
