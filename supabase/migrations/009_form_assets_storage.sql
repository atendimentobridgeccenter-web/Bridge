-- ── Form Assets storage bucket + RLS policies ────────────────
--
-- Bucket público para armazenar logos e imagens dos formulários.
-- Qualquer usuário autenticado pode fazer upload no prefixo logos/.

-- 1. Criar bucket (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-assets',
  'form-assets',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
  SET public             = true,
      file_size_limit    = 3145728,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- 2. Limpar policies anteriores se re-executar
DROP POLICY IF EXISTS "Authenticated users can upload form assets"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update form assets"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete form assets"  ON storage.objects;
DROP POLICY IF EXISTS "Form assets are publicly readable"           ON storage.objects;

-- 3. INSERT
CREATE POLICY "Authenticated users can upload form assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'form-assets');

-- 4. UPDATE
CREATE POLICY "Authenticated users can update form assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'form-assets')
WITH CHECK (bucket_id = 'form-assets');

-- 5. DELETE
CREATE POLICY "Authenticated users can delete form assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'form-assets');

-- 6. SELECT público
CREATE POLICY "Form assets are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'form-assets');
