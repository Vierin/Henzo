-- Add optional Trainer.userId relation to User for invited/account-linked trainers.
ALTER TABLE "Trainer"
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Match Prisma schema (@unique on Trainer.userId).
CREATE UNIQUE INDEX IF NOT EXISTS "Trainer_userId_key"
ON "Trainer"("userId");

-- Match Prisma schema (@@index on Trainer.userId).
CREATE INDEX IF NOT EXISTS "Trainer_userId_idx"
ON "Trainer"("userId");

-- Match Prisma relation: User? @relation(..., onDelete: SetNull)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Trainer_userId_fkey'
  ) THEN
    ALTER TABLE "Trainer"
    ADD CONSTRAINT "Trainer_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
