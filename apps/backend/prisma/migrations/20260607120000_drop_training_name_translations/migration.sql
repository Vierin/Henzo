-- Training names are no longer localized; use `name` only.
ALTER TABLE "Training" DROP COLUMN IF EXISTS "nameEn";
ALTER TABLE "Training" DROP COLUMN IF EXISTS "nameVi";
ALTER TABLE "Training" DROP COLUMN IF EXISTS "nameRu";
