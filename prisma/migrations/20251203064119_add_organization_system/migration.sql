/*
  Warnings:

  - The values [SHOPEE,LAZADA] on the enum `AdPlatform` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `userId` on the `AIProvider` table. All the data in the column will be lost.
  - You are about to drop the column `lastTestStatus` on the `AdAccount` table. All the data in the column will be lost.
  - You are about to drop the column `lastTestedAt` on the `AdAccount` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `AdAccount` table. All the data in the column will be lost.
  - You are about to drop the column `pixelOrTrackingId` on the `AdAccount` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `AdAccount` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `AdCampaign` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `BudgetRequest` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `BudgetRequest` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organizationId,provider]` on the table `AIProvider` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,platform,accountId]` on the table `AdAccount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationId` to the `AIProvider` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountName` to the `AdAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `AdAccount` table without a default value. This is not possible if the table is not empty.
  - Made the column `accountId` on table `AdAccount` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `organizationId` to the `AdCampaign` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `platform` on the `AdCampaign` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `organizationId` to the `Budget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `BudgetRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requesterId` to the `BudgetRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExternalPlatform" AS ENUM ('FACEBOOK_ADS', 'TIKTOK_ADS', 'LAZADA', 'SHOPEE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

-- AlterEnum
BEGIN;
CREATE TYPE "AdPlatform_new" AS ENUM ('FACEBOOK', 'GOOGLE', 'TIKTOK', 'LINE');
ALTER TABLE "AdCampaign" ALTER COLUMN "platform" TYPE "AdPlatform_new" USING ("platform"::text::"AdPlatform_new");
ALTER TABLE "AdAccount" ALTER COLUMN "platform" TYPE "AdPlatform_new" USING ("platform"::text::"AdPlatform_new");
ALTER TYPE "AdPlatform" RENAME TO "AdPlatform_old";
ALTER TYPE "AdPlatform_new" RENAME TO "AdPlatform";
DROP TYPE "AdPlatform_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "AIProvider" DROP CONSTRAINT "AIProvider_userId_fkey";

-- DropForeignKey
ALTER TABLE "AdAccount" DROP CONSTRAINT "AdAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "AdCampaign" DROP CONSTRAINT "AdCampaign_userId_fkey";

-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_userId_fkey";

-- DropForeignKey
ALTER TABLE "BudgetRequest" DROP CONSTRAINT "BudgetRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_userId_fkey";

-- DropIndex
DROP INDEX "AIProvider_userId_provider_key";

-- AlterTable
ALTER TABLE "AIProvider" DROP COLUMN "userId",
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AdAccount" DROP COLUMN "lastTestStatus",
DROP COLUMN "lastTestedAt",
DROP COLUMN "name",
DROP COLUMN "pixelOrTrackingId",
DROP COLUMN "userId",
ADD COLUMN     "accountName" TEXT NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'THB',
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isValid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastTested" TIMESTAMP(3),
ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "testMessage" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
ALTER COLUMN "accountId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AdCampaign" DROP COLUMN "userId",
ADD COLUMN     "adAccountId" TEXT,
ADD COLUMN     "organizationId" TEXT NOT NULL,
DROP COLUMN "platform",
ADD COLUMN     "platform" "AdPlatform" NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN     "adAccountId" TEXT;

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "userId",
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BudgetRequest" DROP COLUMN "reason",
DROP COLUMN "userId",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "requesterId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "userId",
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "organizationId" TEXT;

-- DropEnum
DROP TYPE "AdTestStatus";

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "provider" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacebookAdInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiRecommendation" TEXT,
    "optimizationScore" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacebookAdInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProductSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "aiProvider" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isApplied" BOOLEAN NOT NULL DEFAULT false,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIProductSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformCredential" (
    "id" TEXT NOT NULL,
    "platform" "ExternalPlatform" NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "lastTested" TIMESTAMP(3),
    "testMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "PlatformCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "AIConversation_userId_idx" ON "AIConversation"("userId");

-- CreateIndex
CREATE INDEX "AIConversation_createdAt_idx" ON "AIConversation"("createdAt");

-- CreateIndex
CREATE INDEX "FacebookAdInsight_userId_idx" ON "FacebookAdInsight"("userId");

-- CreateIndex
CREATE INDEX "FacebookAdInsight_adAccountId_idx" ON "FacebookAdInsight"("adAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "FacebookAdInsight_adAccountId_campaignId_date_key" ON "FacebookAdInsight"("adAccountId", "campaignId", "date");

-- CreateIndex
CREATE INDEX "AIProductSuggestion_userId_idx" ON "AIProductSuggestion"("userId");

-- CreateIndex
CREATE INDEX "PlatformCredential_organizationId_idx" ON "PlatformCredential"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_organizationId_idx" ON "Order"("organizationId");

-- CreateIndex
CREATE INDEX "AIProvider_organizationId_idx" ON "AIProvider"("organizationId");

-- CreateIndex
CREATE INDEX "AIProvider_isDefault_idx" ON "AIProvider"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "AIProvider_organizationId_provider_key" ON "AIProvider"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "AdAccount_organizationId_idx" ON "AdAccount"("organizationId");

-- CreateIndex
CREATE INDEX "AdAccount_platform_isDefault_idx" ON "AdAccount"("platform", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "AdAccount_organizationId_platform_accountId_key" ON "AdAccount"("organizationId", "platform", "accountId");

-- CreateIndex
CREATE INDEX "AdCampaign_organizationId_idx" ON "AdCampaign"("organizationId");

-- CreateIndex
CREATE INDEX "AdCampaign_adAccountId_idx" ON "AdCampaign"("adAccountId");

-- CreateIndex
CREATE INDEX "AutomationRule_userId_idx" ON "AutomationRule"("userId");

-- CreateIndex
CREATE INDEX "AutomationRule_adAccountId_idx" ON "AutomationRule"("adAccountId");

-- CreateIndex
CREATE INDEX "Budget_organizationId_idx" ON "Budget"("organizationId");

-- CreateIndex
CREATE INDEX "BudgetRequest_organizationId_idx" ON "BudgetRequest"("organizationId");

-- CreateIndex
CREATE INDEX "BudgetRequest_requesterId_idx" ON "BudgetRequest"("requesterId");

-- CreateIndex
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRequest" ADD CONSTRAINT "BudgetRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRequest" ADD CONSTRAINT "BudgetRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProvider" ADD CONSTRAINT "AIProvider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdAccount" ADD CONSTRAINT "AdAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacebookAdInsight" ADD CONSTRAINT "FacebookAdInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacebookAdInsight" ADD CONSTRAINT "FacebookAdInsight_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProductSuggestion" ADD CONSTRAINT "AIProductSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProductSuggestion" ADD CONSTRAINT "AIProductSuggestion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCredential" ADD CONSTRAINT "PlatformCredential_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
