-- Training language code used in owner catalog and client browse filters.
ALTER TABLE "Training"
ADD COLUMN IF NOT EXISTS "language" TEXT;
