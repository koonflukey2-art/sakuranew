-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "productType" INTEGER,
ALTER COLUMN "quantity" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productType" INTEGER;

-- CreateIndex
CREATE INDEX "Order_productType_idx" ON "Order"("productType");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Product_productType_idx" ON "Product"("productType");
