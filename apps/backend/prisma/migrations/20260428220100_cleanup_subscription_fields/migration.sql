-- Keep subscription model minimal for Free/Pro flow.
ALTER TABLE "Subscription"
DROP COLUMN IF EXISTS "endDate",
DROP COLUMN IF EXISTS "nextPaymentDate",
DROP COLUMN IF EXISTS "trialEndDate";
