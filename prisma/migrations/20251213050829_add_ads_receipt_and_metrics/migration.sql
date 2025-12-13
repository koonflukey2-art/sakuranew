/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,date]` on the table `DailySummary` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AdCampaign" ADD COLUMN     "cpa" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "cpc" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "cpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "impressions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "profitMargin" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "remaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "roas" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AdReceipt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "receiptUrl" TEXT,
    "qrCodeData" TEXT,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdMetrics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdReceipt_receiptNumber_key" ON "AdReceipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "AdReceipt_organizationId_idx" ON "AdReceipt"("organizationId");

-- CreateIndex
CREATE INDEX "AdReceipt_campaignId_idx" ON "AdReceipt"("campaignId");

-- CreateIndex
CREATE INDEX "AdReceipt_platform_idx" ON "AdReceipt"("platform");

-- CreateIndex
CREATE INDEX "AdReceipt_isProcessed_idx" ON "AdReceipt"("isProcessed");

-- CreateIndex
CREATE INDEX "AdReceipt_paidAt_idx" ON "AdReceipt"("paidAt");

-- CreateIndex
CREATE INDEX "AdMetrics_organizationId_idx" ON "AdMetrics"("organizationId");

-- CreateIndex
CREATE INDEX "AdMetrics_date_idx" ON "AdMetrics"("date");

-- CreateIndex
CREATE INDEX "AdMetrics_campaignId_idx" ON "AdMetrics"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "AdMetrics_campaignId_date_key" ON "AdMetrics"("campaignId", "date");

-- CreateIndex
CREATE INDEX "AdCampaign_platform_idx" ON "AdCampaign"("platform");

-- CreateIndex
CREATE INDEX "AdCampaign_status_idx" ON "AdCampaign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DailySummary_organizationId_date_key" ON "DailySummary"("organizationId", "date");

-- AddForeignKey
ALTER TABLE "AdReceipt" ADD CONSTRAINT "AdReceipt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdMetrics" ADD CONSTRAINT "AdMetrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
