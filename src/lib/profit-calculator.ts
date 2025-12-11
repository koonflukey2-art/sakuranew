import { prisma } from "@/lib/prisma";

interface OrderItem {
  productType: number | null;
  quantity: number;
  amount: number;
}

interface ProfitCalculation {
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export async function calculateOrderProfit(
  order: OrderItem,
  organizationId: string
): Promise<ProfitCalculation> {
  if (!order.productType) {
    return {
      revenue: order.amount,
      cost: 0,
      profit: order.amount,
      margin: order.amount === 0 ? 0 : 100,
    };
  }

  const product = await prisma.product.findFirst({
    where: {
      organizationId,
      productType: order.productType,
    },
  });

  if (!product) {
    return {
      revenue: order.amount,
      cost: 0,
      profit: order.amount,
      margin: order.amount === 0 ? 0 : 100,
    };
  }

  const promotion = await prisma.promotion.findFirst({
    where: {
      productId: product.id,
      isActive: true,
    },
  });

  let effectiveCostPerUnit = product.costPrice;

  if (promotion) {
    const totalUnits = promotion.buyQuantity + promotion.freeQuantity;
    if (promotion.buyQuantity > 0 && totalUnits > 0) {
      const totalCost = product.costPrice * promotion.buyQuantity;
      effectiveCostPerUnit = totalCost / totalUnits;
    }
  }

  const totalCost = effectiveCostPerUnit * order.quantity;
  const profit = order.amount - totalCost;
  const margin = order.amount === 0 ? 0 : (profit / order.amount) * 100;

  return {
    revenue: order.amount,
    cost: totalCost,
    profit,
    margin,
  };
}

export async function calculateTotalProfit(
  orders: OrderItem[],
  organizationId: string
): Promise<ProfitCalculation> {
  let totalRevenue = 0;
  let totalCost = 0;

  for (const order of orders) {
    const calc = await calculateOrderProfit(order, organizationId);
    totalRevenue += calc.revenue;
    totalCost += calc.cost;
  }

  const totalProfit = totalRevenue - totalCost;
  const totalMargin = totalRevenue === 0 ? 0 : (totalProfit / totalRevenue) * 100;

  return {
    revenue: totalRevenue,
    cost: totalCost,
    profit: totalProfit,
    margin: totalMargin,
  };
}

export async function getBudgetAdjustedProfit(organizationId: string) {
  const budget = await prisma.capitalBudget.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  const orders = await prisma.order.findMany({
    where: { organizationId },
  });

  const profitCalc = await calculateTotalProfit(
    orders.map((o) => ({
      productType: o.productType ?? null,
      quantity: o.quantity,
      amount: o.amount,
    })),
    organizationId
  );

  const budgetUsed = budget ? budget.amount - budget.remaining : 0;
  const netProfit = profitCalc.profit - budgetUsed;

  return {
    profit: profitCalc.profit,
    budgetUsed,
    netProfit,
  };
}
