-- Pending enrollments when studio requires owner confirmation
ALTER TYPE "SessionEnrollmentStatus" ADD VALUE IF NOT EXISTS 'PENDING';

-- Default: auto-confirm on (no owner approval needed)
ALTER TABLE "Studio"
  ALTER COLUMN "autoConfirmBookings" SET DEFAULT true;

-- Claimed / self-serve studios: auto-confirm
UPDATE "Studio"
SET "autoConfirmBookings" = true
WHERE "claimedAt" IS NOT NULL
   OR "intendedOwnerEmail" IS NULL;

-- Unclaimed ops-created studios: require confirmation
UPDATE "Studio"
SET "autoConfirmBookings" = false
WHERE "claimedAt" IS NULL
  AND "intendedOwnerEmail" IS NOT NULL;
