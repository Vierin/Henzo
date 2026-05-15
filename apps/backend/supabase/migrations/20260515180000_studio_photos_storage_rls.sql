-- studio-photos bucket: mobile uploads to owners/{auth.uid()}/…
-- Run in Supabase Dashboard → SQL Editor (or: supabase db push)

INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-photos', 'studio-photos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "studio_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "studio_photos_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "studio_photos_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "studio_photos_owner_delete" ON storage.objects;

-- Public URLs (getPublicUrl)
CREATE POLICY "studio_photos_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'studio-photos');

CREATE POLICY "studio_photos_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'studio-photos'
  AND (storage.foldername(name))[1] = 'owners'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "studio_photos_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'studio-photos'
  AND (storage.foldername(name))[1] = 'owners'
  AND (storage.foldername(name))[2] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'studio-photos'
  AND (storage.foldername(name))[1] = 'owners'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "studio_photos_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'studio-photos'
  AND (storage.foldername(name))[1] = 'owners'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);
