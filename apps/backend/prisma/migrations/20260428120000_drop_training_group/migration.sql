-- Drop FK from Training to TrainingGroup (Prisma default name)
ALTER TABLE "Training" DROP CONSTRAINT IF EXISTS "Training_trainingGroupId_fkey";

ALTER TABLE "Training" DROP COLUMN IF EXISTS "trainingGroupId";

DROP TABLE IF EXISTS "TrainingGroup";
