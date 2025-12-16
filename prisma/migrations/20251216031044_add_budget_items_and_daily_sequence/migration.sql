-- CreateTable for BudgetItem
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable Budget - Update structure
ALTER TABLE "Budget" DROP COLUMN IF EXISTS "amount";
ALTER TABLE "Budget" DROP COLUMN IF EXISTS "purpose";
ALTER TABLE "Budget" DROP COLUMN IF EXISTS "spent";
ALTER TABLE "Budget" DROP COLUMN IF EXISTS "startDate";
ALTER TABLE "Budget" DROP COLUMN IF EXISTS "endDate";

ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "totalAmount" DOUBLE PRECISION;
ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "remaining" DOUBLE PRECISION;
ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update Budget totalAmount and remaining for existing records (set to 0 if null)
UPDATE "Budget" SET "totalAmount" = 0 WHERE "totalAmount" IS NULL;
UPDATE "Budget" SET "remaining" = 0 WHERE "remaining" IS NULL;

-- Make totalAmount and remaining NOT NULL after setting defaults
ALTER TABLE "Budget" ALTER COLUMN "totalAmount" SET NOT NULL;
ALTER TABLE "Budget" ALTER COLUMN "remaining" SET NOT NULL;

-- AlterTable Order - Add new fields
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "dailySequence" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- Update customerId to be optional
ALTER TABLE "Order" ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable SystemSettings - Add daily counter fields
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "lastCutOffTime" TIMESTAMP(3);
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "currentDailySequence" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BudgetItem_budgetId_idx" ON "BudgetItem"("budgetId");
CREATE INDEX IF NOT EXISTS "Order_dailySequence_idx" ON "Order"("dailySequence");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BudgetItem_budgetId_fkey'
    ) THEN
        ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_budgetId_fkey"
        FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
