-- Downgrade is scheduled for the next charge. Current plan stays until then.
ALTER TABLE "Subscription" ADD COLUMN "pendingType" "SubscriptionType";
ALTER TABLE "Subscription" ADD COLUMN "pendingEffectiveAt" TIMESTAMP(3);
