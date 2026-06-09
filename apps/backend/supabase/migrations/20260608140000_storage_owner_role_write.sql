-- Restrict studio-photos writes to OWNER role (defense-in-depth).
-- Public read kept for mobile getPublicUrl().

DROP POLICY IF EXISTS "studio_photos_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "studio_photos_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "studio_photos_owner_delete" ON storage.objects;

CREATE POLICY "studio_photos_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'studio-photos'
  AND name LIKE 'owners/' || auth.uid()::text || '/%'
  AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'OWNER'
);

CREATE POLICY "studio_photos_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'studio-photos'
  AND name LIKE 'owners/' || auth.uid()::text || '/%'
  AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'OWNER'
)
WITH CHECK (
  bucket_id = 'studio-photos'
  AND name LIKE 'owners/' || auth.uid()::text || '/%'
  AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'OWNER'
);

CREATE POLICY "studio_photos_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'studio-photos'
  AND name LIKE 'owners/' || auth.uid()::text || '/%'
  AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'OWNER'
);
