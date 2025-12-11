/*
  Warnings:

  - Made the column `productType` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productTypeName" TEXT,
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "productType" SET NOT NULL;

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "buyQuantity" INTEGER NOT NULL,
    "freeQuantity" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "typeNumber" INTEGER NOT NULL,
    "typeName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPI" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitMargin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productsSold" INTEGER NOT NULL DEFAULT 0,
    "avgOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockTurnover" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costEfficiency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitTarget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productType" INTEGER,
    "targetMargin" DOUBLE PRECISION NOT NULL,
    "minMargin" DOUBLE PRECISION NOT NULL,
    "alertThreshold" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfitTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySummary" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "productsSold" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cutOffTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dailyCutOffHour" INTEGER NOT NULL DEFAULT 23,
    "dailyCutOffMinute" INTEGER NOT NULL DEFAULT 59,
    "lineNotifyToken" TEXT,
    "lineChannelAccessToken" TEXT,
    "lineChannelSecret" TEXT,
    "lineWebhookUrl" TEXT,
    "adminEmails" TEXT,
    "notifyOnOrder" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnLowStock" BOOLEAN NOT NULL DEFAULT true,
    "notifyDailySummary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Promotion_organizationId_idx" ON "Promotion"("organizationId");

-- CreateIndex
CREATE INDEX "Promotion_productId_idx" ON "Promotion"("productId");

-- CreateIndex
CREATE INDEX "Promotion_isActive_idx" ON "Promotion"("isActive");

-- CreateIndex
CREATE INDEX "ProductType_organizationId_idx" ON "ProductType"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_organizationId_typeNumber_key" ON "ProductType"("organizationId", "typeNumber");

-- CreateIndex
CREATE INDEX "KPI_organizationId_date_idx" ON "KPI"("organizationId", "date");

-- CreateIndex
CREATE INDEX "KPI_organizationId_period_idx" ON "KPI"("organizationId", "period");

-- CreateIndex
CREATE INDEX "ProfitTarget_organizationId_idx" ON "ProfitTarget"("organizationId");

-- CreateIndex
CREATE INDEX "ProfitTarget_organizationId_productType_idx" ON "ProfitTarget"("organizationId", "productType");

-- CreateIndex
CREATE INDEX "DailySummary_organizationId_date_idx" ON "DailySummary"("organizationId", "date");

-- CreateIndex
CREATE INDEX "DailySummary_date_idx" ON "DailySummary"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_organizationId_key" ON "SystemSettings"("organizationId");

-- CreateIndex
CREATE INDEX "SystemSettings_organizationId_idx" ON "SystemSettings"("organizationId");

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductType" ADD CONSTRAINT "ProductType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
