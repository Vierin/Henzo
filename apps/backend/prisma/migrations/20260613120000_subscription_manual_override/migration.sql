-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "manualOverride" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN "manualOverrideAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "manualOverrideBy" TEXT;
