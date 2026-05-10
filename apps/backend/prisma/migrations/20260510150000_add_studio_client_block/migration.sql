-- CreateTable
CREATE TABLE "StudioClientBlock" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioClientBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioClientBlock_studioId_createdAt_idx" ON "StudioClientBlock"("studioId", "createdAt");

-- CreateIndex
CREATE INDEX "StudioClientBlock_studioId_userId_idx" ON "StudioClientBlock"("studioId", "userId");

-- CreateIndex
CREATE INDEX "StudioClientBlock_studioId_email_idx" ON "StudioClientBlock"("studioId", "email");

-- CreateIndex
CREATE INDEX "StudioClientBlock_studioId_phone_idx" ON "StudioClientBlock"("studioId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "StudioClientBlock_studioId_userId_key" ON "StudioClientBlock"("studioId", "userId");

-- AddForeignKey
ALTER TABLE "StudioClientBlock" ADD CONSTRAINT "StudioClientBlock_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioClientBlock" ADD CONSTRAINT "StudioClientBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
