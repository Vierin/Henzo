CREATE TABLE "PendingBusinessRegistration" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingBusinessRegistration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientRegistrationOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRegistrationOtp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingBusinessRegistration_token_key" ON "PendingBusinessRegistration"("token");
CREATE INDEX "PendingBusinessRegistration_email_expiresAt_idx" ON "PendingBusinessRegistration"("email", "expiresAt");
CREATE INDEX "PendingBusinessRegistration_userId_idx" ON "PendingBusinessRegistration"("userId");

CREATE UNIQUE INDEX "ClientRegistrationOtp_email_key" ON "ClientRegistrationOtp"("email");
CREATE INDEX "ClientRegistrationOtp_expiresAt_idx" ON "ClientRegistrationOtp"("expiresAt");
