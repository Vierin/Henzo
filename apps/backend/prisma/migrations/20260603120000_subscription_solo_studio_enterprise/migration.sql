-- Solo (free), Studio and Enterprise (paid).
CREATE TYPE "SubscriptionType_new" AS ENUM ('SOLO', 'STUDIO', 'ENTERPRISE');

ALTER TABLE "Subscription"
  ALTER COLUMN "type" DROP DEFAULT;

ALTER TABLE "Subscription"
  ALTER COLUMN "type" TYPE "SubscriptionType_new"
  USING (
    CASE "type"::text
      WHEN 'FREEMIUM' THEN 'SOLO'::"SubscriptionType_new"
      WHEN 'PRO' THEN 'STUDIO'::"SubscriptionType_new"
      ELSE 'SOLO'::"SubscriptionType_new"
    END
  );

ALTER TABLE "Subscription"
  ALTER COLUMN "type" SET DEFAULT 'SOLO'::"SubscriptionType_new";

DROP TYPE "SubscriptionType";

ALTER TYPE "SubscriptionType_new" RENAME TO "SubscriptionType";
