-- Studio photos remain public-read for mobile getPublicUrl() display.
-- Upload paths must stay owners/{auth.uid()}/… (see 20260515180000).
-- Future: move to private bucket + signed URLs via backend when ready.

COMMENT ON POLICY "studio_photos_public_read" ON storage.objects IS
  'Public read for studio-photos; restrict write to owners/{uid}/ paths';
