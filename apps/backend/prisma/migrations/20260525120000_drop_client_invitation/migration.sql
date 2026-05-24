-- Drop unused ClientInvitation table (MVP uses class share links + owner enrollment).

DROP TABLE IF EXISTS "ClientInvitation";

-- Remove INVITE from StudioClientSource enum.
UPDATE "StudioClient" SET "source" = 'ENROLLMENT' WHERE "source" = 'INVITE';

ALTER TYPE "StudioClientSource" RENAME TO "StudioClientSource_old";
CREATE TYPE "StudioClientSource" AS ENUM ('MANUAL', 'ENROLLMENT');
ALTER TABLE "StudioClient" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "StudioClient"
  ALTER COLUMN "source" TYPE "StudioClientSource"
  USING ("source"::text::"StudioClientSource");
ALTER TABLE "StudioClient" ALTER COLUMN "source" SET DEFAULT 'MANUAL';
DROP TYPE "StudioClientSource_old";
