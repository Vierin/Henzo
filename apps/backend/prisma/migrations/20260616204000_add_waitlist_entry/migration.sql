-- Waitlist entries for full training sessions.
CREATE TABLE IF NOT EXISTS "WaitlistEntry" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WaitlistEntry_sessionId_userId_key"
ON "WaitlistEntry"("sessionId", "userId");

CREATE INDEX IF NOT EXISTS "WaitlistEntry_sessionId_createdAt_idx"
ON "WaitlistEntry"("sessionId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WaitlistEntry_sessionId_fkey'
  ) THEN
    ALTER TABLE "WaitlistEntry"
    ADD CONSTRAINT "WaitlistEntry_sessionId_fkey"
    FOREIGN KEY ("sessionId")
    REFERENCES "TrainingSession"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WaitlistEntry_userId_fkey'
  ) THEN
    ALTER TABLE "WaitlistEntry"
    ADD CONSTRAINT "WaitlistEntry_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;
