/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,platform]` on the table `PlatformCredential` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PlatformCredential_organizationId_platform_key" ON "PlatformCredential"("organizationId", "platform");
