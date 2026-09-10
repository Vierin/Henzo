-- AlterTable
ALTER TABLE "Studio" ADD COLUMN IF NOT EXISTS "currency" TEXT;

-- Existing studios priced in VND
UPDATE "Studio" SET "currency" = 'VND' WHERE "currency" IS NULL;

ALTER TABLE "Studio" ALTER COLUMN "currency" SET DEFAULT 'EUR';
ALTER TABLE "Studio" ALTER COLUMN "currency" SET NOT NULL;
