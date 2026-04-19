-- CreateTable
CREATE TABLE "PlatformStripeCoupon" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "stripeCouponId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "useForAutoAnnual" BOOLEAN NOT NULL DEFAULT false,
    "percentOff" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformStripeCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformStripeCoupon_stripeCouponId_key" ON "PlatformStripeCoupon"("stripeCouponId");
