/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,fileHash]` on the table `AdReceipt` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,qrHash]` on the table `AdReceipt` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AdReceipt" ADD COLUMN     "fileHash" CHAR(64),
ADD COLUMN     "qrHash" CHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "AdReceipt_organizationId_fileHash_key" ON "AdReceipt"("organizationId", "fileHash");

-- CreateIndex
CREATE UNIQUE INDEX "AdReceipt_organizationId_qrHash_key" ON "AdReceipt"("organizationId", "qrHash");
