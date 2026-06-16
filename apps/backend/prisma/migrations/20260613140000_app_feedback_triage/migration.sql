-- AlterTable
ALTER TABLE "AppFeedback" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'open';
ALTER TABLE "AppFeedback" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "AppFeedback" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "AppFeedback" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'mobile';

CREATE INDEX "AppFeedback_status_createdAt_idx" ON "AppFeedback"("status", "createdAt");
