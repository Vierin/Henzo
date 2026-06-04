-- CreateTable (idempotent: table may exist if a previous deploy partially applied)
CREATE TABLE IF NOT EXISTS "ScheduledPushReminder" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledPushReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduledPushReminder_scheduledFor_sentAt_idx" ON "ScheduledPushReminder"("scheduledFor", "sentAt");

CREATE INDEX IF NOT EXISTS "ScheduledPushReminder_enrollmentId_idx" ON "ScheduledPushReminder"("enrollmentId");

CREATE UNIQUE INDEX IF NOT EXISTS "ScheduledPushReminder_enrollmentId_type_key" ON "ScheduledPushReminder"("enrollmentId", "type");
