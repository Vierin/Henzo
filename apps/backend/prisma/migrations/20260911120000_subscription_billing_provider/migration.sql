-- CreateEnum
CREATE TYPE "SubscriptionBillingProvider" AS ENUM ('NONE', 'STRIPE', 'REVENUECAT');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "billingProvider" "SubscriptionBillingProvider" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Subscription" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "stripePriceId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
