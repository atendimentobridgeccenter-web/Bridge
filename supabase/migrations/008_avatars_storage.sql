-- ── Avatars storage bucket + RLS policies ────────────────────
--
-- Run this once in Supabase SQL Editor.
-- Creates the public 'avatars' bucket and policies so that
-- authenticated users can upload/replace their own avatar file.

-- 1. Create bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  3145728,  -- 3 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public            = true,
      file_size_limit   = 3145728,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Drop existing policies if re-running
DROP POLICY IF EXISTS "Authenticated users can upload their own avatar"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their own avatar"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their own avatar"  ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable"                    ON storage.objects;

-- 3. INSERT — only own file (name starts with auth.uid())
CREATE POLICY "Authenticated users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND starts_with(name, auth.uid()::text)
);

-- 4. UPDATE — only own file
CREATE POLICY "Authenticated users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND starts_with(name, auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'avatars'
  AND starts_with(name, auth.uid()::text)
);

-- 5. DELETE — only own file
CREATE POLICY "Authenticated users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND starts_with(name, auth.uid()::text)
);

-- 6. SELECT — public (bucket is public, so this is for RLS completeness)
CREATE POLICY "Avatars are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
