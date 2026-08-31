-- ── Adicionar application/pdf ao bucket form-assets ──────────
--
-- O bucket foi criado em 009 apenas com tipos de imagem.
-- PDFs de termos e condições (nó confirm) precisam ser permitidos.

UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/pdf'
  ],
  file_size_limit = 10485760   -- 10 MB (era 3 MB)
WHERE id = 'form-assets';
