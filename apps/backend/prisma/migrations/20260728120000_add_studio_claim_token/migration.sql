-- AlterTable
ALTER TABLE "Studio" ADD COLUMN IF NOT EXISTS "intendedOwnerEmail" TEXT;
ALTER TABLE "Studio" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Studio_intendedOwnerEmail_idx" ON "Studio"("intendedOwnerEmail");

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StudioClaimStatus') THEN
    CREATE TYPE "StudioClaimStatus" AS ENUM (
      'PENDING',
      'ACCEPTED',
      'REVOKED',
      'EXPIRED'
    );
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "StudioClaimToken" (
  "id" TEXT NOT NULL,
  "studioId" TEXT NOT NULL,
  "ownerEmail" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "StudioClaimStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "claimedAt" TIMESTAMP(3),
  "claimedByUserId" TEXT,
  "createdBy" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudioClaimToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudioClaimToken_tokenHash_key"
ON "StudioClaimToken"("tokenHash");

CREATE INDEX IF NOT EXISTS "StudioClaimToken_studioId_status_idx"
ON "StudioClaimToken"("studioId", "status");

CREATE INDEX IF NOT EXISTS "StudioClaimToken_ownerEmail_status_idx"
ON "StudioClaimToken"("ownerEmail", "status");

CREATE INDEX IF NOT EXISTS "StudioClaimToken_expiresAt_idx"
ON "StudioClaimToken"("expiresAt");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudioClaimToken_studioId_fkey'
  ) THEN
    ALTER TABLE "StudioClaimToken"
    ADD CONSTRAINT "StudioClaimToken_studioId_fkey"
    FOREIGN KEY ("studioId") REFERENCES "Studio"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
