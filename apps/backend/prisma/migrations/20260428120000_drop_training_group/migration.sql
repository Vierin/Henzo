DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Training'
  ) THEN
    -- Drop FK from Training to TrainingGroup (Prisma default name)
    ALTER TABLE "Training" DROP CONSTRAINT IF EXISTS "Training_trainingGroupId_fkey";
    ALTER TABLE "Training" DROP COLUMN IF EXISTS "trainingGroupId";
  END IF;
END $$;

DROP TABLE IF EXISTS "TrainingGroup";
