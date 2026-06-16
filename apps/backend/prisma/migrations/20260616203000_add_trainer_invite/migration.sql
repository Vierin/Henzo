-- Trainer invite links for onboarding staff into a studio account.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'TrainerInviteStatus'
  ) THEN
    CREATE TYPE "TrainerInviteStatus" AS ENUM (
      'PENDING',
      'ACCEPTED',
      'EXPIRED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TrainerInvite" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "studioId" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "status" "TrainerInviteStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainerInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrainerInvite_token_key"
ON "TrainerInvite"("token");

CREATE UNIQUE INDEX IF NOT EXISTS "TrainerInvite_trainerId_key"
ON "TrainerInvite"("trainerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TrainerInvite_studioId_fkey'
  ) THEN
    ALTER TABLE "TrainerInvite"
    ADD CONSTRAINT "TrainerInvite_studioId_fkey"
    FOREIGN KEY ("studioId")
    REFERENCES "Studio"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TrainerInvite_trainerId_fkey'
  ) THEN
    ALTER TABLE "TrainerInvite"
    ADD CONSTRAINT "TrainerInvite_trainerId_fkey"
    FOREIGN KEY ("trainerId")
    REFERENCES "Trainer"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;
