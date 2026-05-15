-- CreateEnum
CREATE TYPE "StudioClientSource" AS ENUM ('MANUAL', 'ENROLLMENT', 'INVITE');

-- CreateTable
CREATE TABLE "StudioClient" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "StudioClientSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientInvitation" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sessionId" TEXT,
    "createdByUserId" TEXT,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioClient_studioId_userId_key"
  ON "StudioClient"("studioId", "userId");

CREATE INDEX "StudioClient_studioId_createdAt_idx"
  ON "StudioClient"("studioId", "createdAt");

CREATE UNIQUE INDEX "ClientInvitation_tokenHash_key"
  ON "ClientInvitation"("tokenHash");

CREATE INDEX "ClientInvitation_studioId_email_idx"
  ON "ClientInvitation"("studioId", "email");

CREATE INDEX "ClientInvitation_expiresAt_idx"
  ON "ClientInvitation"("expiresAt");

ALTER TABLE "StudioClient" ADD CONSTRAINT "StudioClient_studioId_fkey"
  FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioClient" ADD CONSTRAINT "StudioClient_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientInvitation" ADD CONSTRAINT "ClientInvitation_studioId_fkey"
  FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientInvitation" ADD CONSTRAINT "ClientInvitation_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientInvitation" ADD CONSTRAINT "ClientInvitation_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
