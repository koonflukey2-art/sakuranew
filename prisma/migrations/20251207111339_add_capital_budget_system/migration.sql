-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CapitalBudget" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "remaining" DOUBLE PRECISION NOT NULL,
    "minThreshold" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "CapitalBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapitalBudgetTransaction" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "productId" TEXT,
    "orderId" TEXT,
    "createdBy" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapitalBudgetTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CapitalBudget_organizationId_idx" ON "CapitalBudget"("organizationId");

-- CreateIndex
CREATE INDEX "CapitalBudgetTransaction_budgetId_idx" ON "CapitalBudgetTransaction"("budgetId");

-- CreateIndex
CREATE INDEX "CapitalBudgetTransaction_organizationId_idx" ON "CapitalBudgetTransaction"("organizationId");

-- CreateIndex
CREATE INDEX "CapitalBudgetTransaction_createdAt_idx" ON "CapitalBudgetTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "CapitalBudget" ADD CONSTRAINT "CapitalBudget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalBudgetTransaction" ADD CONSTRAINT "CapitalBudgetTransaction_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "CapitalBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
