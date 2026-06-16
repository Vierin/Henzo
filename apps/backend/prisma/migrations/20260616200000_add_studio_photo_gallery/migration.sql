-- Studio photo gallery: original + crop metadata + cached variants.
ALTER TABLE "Studio"
ADD COLUMN IF NOT EXISTS "photoGallery" JSONB;
