import { prisma } from "@/lib/prisma";

interface OrderItem {
  productType: number | null;
  quantity: number; // จำนวนที่ส่งจริง (รวมของแถมแล้ว)
  amount: number;   // ยอดเงินที่เก็บจริง
}

interface ProfitCalculation {
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface PromotionDiscount {
  discountPercent?: number | null;
  discountAmount?: number | null;
}

export interface OrderProfitWithDiscounts extends ProfitCalculation {
  discountedRevenue: number;
  discountAmount: number;
}

/**
 * คิดต้นทุนตามโปรโมชั่นแบบ bundle:
 * - โปรซื้อ X แถม Y -> 1 ชุดมี (X+Y) ชิ้น
 * - ต้นทุนต่อ "ชุด" = X * costPrice (ของแถมถือว่าต้นทุน 0 ตามแนวคิดโปร)
 * - ถ้ามีเศษ (remainder) ที่ไม่ครบชุด -> คิดต้นทุนตาม costPrice ปกติ
 */
function calcCostWithPromotionBundle(params: {
  costPrice: number;
  quantity: number;
  buyQuantity: number;
  freeQuantity: number;
}) {
  const { costPrice, quantity, buyQuantity, freeQuantity } = params;

  if (costPrice <= 0 || quantity <= 0) {
    return { totalCost: 0, effectiveUnitCost: 0 };
  }

  const totalUnits = buyQuantity + freeQuantity;

  // โปรผิดปกติ/ไม่ครบ -> fallback ปกติ
  if (buyQuantity <= 0 || totalUnits <= 0) {
    const totalCost = costPrice * quantity;
    return { totalCost, effectiveUnitCost: totalCost / quantity };
  }

  const bundles = Math.floor(quantity / totalUnits);
  const remainder = quantity % totalUnits;

  // ✅ 1 bundle ต้นทุน = buyQuantity * costPrice
  const totalCost = bundles * buyQuantity * costPrice + remainder * costPrice;

  return {
    totalCost,
    effectiveUnitCost: totalCost / quantity,
  };
}

function calculateDiscountedRevenue(
  revenue: number,
  promotion?: PromotionDiscount | null
) {
  if (!promotion) {
    return { discountedRevenue: revenue, discountAmount: 0 };
  }

  const percent = Math.min(Math.max(Number(promotion.discountPercent ?? 0), 0), 100);
  const flat = Math.max(Number(promotion.discountAmount ?? 0), 0);
  const percentDiscount = revenue * (percent / 100);
  const discountAmount = Math.min(revenue, percentDiscount + flat);

  return {
    discountedRevenue: Math.max(revenue - discountAmount, 0),
    discountAmount,
  };
}

export function calculateOrderProfitWithPromotionData(params: {
  order: OrderItem;
  product?: { costPrice: number } | null;
  promotion?: {
    buyQuantity: number;
    freeQuantity: number;
    discountPercent?: number | null;
    discountAmount?: number | null;
  } | null;
}): OrderProfitWithDiscounts {
  const revenue = Number(params.order.amount) || 0;
  const { discountedRevenue, discountAmount } = calculateDiscountedRevenue(
    revenue,
    params.promotion
  );

  if (!params.product) {
    const profit = discountedRevenue;
    return {
      revenue,
      discountedRevenue,
      discountAmount,
      cost: 0,
      profit,
      margin: discountedRevenue === 0 ? 0 : (profit / discountedRevenue) * 100,
    };
  }

  const costPrice = Number(params.product.costPrice) || 0;
  const qty = Number(params.order.quantity) || 0;

  if (qty <= 0) {
    const profit = discountedRevenue;
    return {
      revenue,
      discountedRevenue,
      discountAmount,
      cost: 0,
      profit,
      margin: discountedRevenue === 0 ? 0 : (profit / discountedRevenue) * 100,
    };
  }

  let totalCost = 0;

  if (params.promotion) {
    const r = calcCostWithPromotionBundle({
      costPrice,
      quantity: qty,
      buyQuantity: Number(params.promotion.buyQuantity) || 0,
      freeQuantity: Number(params.promotion.freeQuantity) || 0,
    });
    totalCost = r.totalCost;
  } else {
    totalCost = costPrice * qty;
  }

  const profit = discountedRevenue - totalCost;
  const margin =
    discountedRevenue === 0 ? 0 : (profit / discountedRevenue) * 100;

  return {
    revenue,
    discountedRevenue,
    discountAmount,
    cost: totalCost,
    profit,
    margin,
  };
}

export async function calculateOrderProfit(
  order: OrderItem,
  organizationId: string
): Promise<ProfitCalculation> {
  const revenue = Number(order.amount) || 0;

  // ไม่มี productType -> ต้นทุน 0
  if (!order.productType) {
    const profit = revenue;
    return {
      revenue,
      cost: 0,
      profit,
      margin: revenue === 0 ? 0 : (profit / revenue) * 100,
    };
  }

  // หา product จาก productType
  const product = await prisma.product.findFirst({
    where: {
      organizationId,
      productType: order.productType,
    },
    select: {
      id: true,
      costPrice: true,
    },
  });

  // ไม่พบสินค้า -> ต้นทุน 0
  if (!product) {
    const profit = revenue;
    return {
      revenue,
      cost: 0,
      profit,
      margin: revenue === 0 ? 0 : (profit / revenue) * 100,
    };
  }

  const costPrice = Number(product.costPrice) || 0;
  const qty = Number(order.quantity) || 0;

  // qty <= 0 -> ต้นทุน 0
  if (qty <= 0) {
    const profit = revenue;
    return {
      revenue,
      cost: 0,
      profit,
      margin: revenue === 0 ? 0 : (profit / revenue) * 100,
    };
  }

  // หาโปรโมชั่น active ของสินค้านี้ (ใน org เดียวกัน)
  const promotion = await prisma.promotion.findFirst({
    where: {
      organizationId,
      productId: product.id,
      isActive: true,
    },
    select: {
      buyQuantity: true,
      freeQuantity: true,
    },
  });

  let totalCost = 0;

  if (promotion) {
    // ✅ คิดต้นทุนแบบ bundle ตามโปร
    const r = calcCostWithPromotionBundle({
      costPrice,
      quantity: qty,
      buyQuantity: Number(promotion.buyQuantity) || 0,
      freeQuantity: Number(promotion.freeQuantity) || 0,
    });
    totalCost = r.totalCost;
  } else {
    // ไม่มีโปร -> ต้นทุนปกติ
    totalCost = costPrice * qty;
  }

  const profit = revenue - totalCost;
  const margin = revenue === 0 ? 0 : (profit / revenue) * 100;

  return {
    revenue,
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
  const totalMargin =
    totalRevenue === 0 ? 0 : (totalProfit / totalRevenue) * 100;

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

  // ✅ แนะนำ: เอาเฉพาะ COMPLETED ถ้าระบบคุณใช้ status
  const orders = await prisma.order.findMany({
    where: { organizationId },
    select: {
      productType: true,
      quantity: true,
      amount: true,
      // status: true,
    },
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

// ========================================
// COMPREHENSIVE PROFIT CALCULATION (WITH ADS SPEND)
// ========================================

export interface ComprehensiveProfitCalculation {
  // Revenue
  orderRevenue: number;
  totalRevenue: number;

  // Costs
  productCosts: number;
  adsSpend: number;
  budgetUsed: number;
  totalCosts: number;

  // Profit
  grossProfit: number; // Revenue - Product Costs
  netProfit: number; // Revenue - All Costs
  profitMargin: number;

  // Breakdown
  orderCount: number;
  adReceiptsCount: number;
  promotionSavings: number;
}

/**
 * Calculate comprehensive profit including ads spend from receipts
 * This connects the receipt system to profit calculations
 */
export async function calculateComprehensiveProfit(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ComprehensiveProfitCalculation> {
  const start = startDate || new Date(new Date().setHours(0, 0, 0, 0));
  const end = endDate || new Date(new Date().setHours(23, 59, 59, 999));

  // Get orders in date range
  const orders = await prisma.order.findMany({
    where: {
      organizationId,
      orderDate: { gte: start, lte: end },
      status: "COMPLETED", // Only completed orders
    },
    select: {
      productType: true,
      quantity: true,
      amount: true,
    },
  });

  // Calculate order revenue and product costs
  const profitCalc = await calculateTotalProfit(
    orders.map((o) => ({
      productType: o.productType ?? null,
      quantity: o.quantity,
      amount: o.amount,
    })),
    organizationId
  );

  const orderRevenue = profitCalc.revenue;
  const productCosts = profitCalc.cost;

  // Get ads spend from receipts
  const adsReceipts = await prisma.adReceipt.findMany({
    where: {
      organizationId,
      paidAt: { gte: start, lte: end },
    },
    select: {
      amount: true,
    },
  });

  const adsSpend = adsReceipts.reduce((sum, r) => sum + r.amount, 0);

  // Get budget used
  const budgets = await prisma.capitalBudget.findMany({
    where: { organizationId },
  });

  const budgetUsed = budgets.reduce(
    (sum, b) => sum + (b.amount - b.remaining),
    0
  );

  // Calculate totals
  const totalRevenue = orderRevenue;
  const totalCosts = productCosts + adsSpend + budgetUsed;
  const grossProfit = orderRevenue - productCosts;
  const netProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    orderRevenue,
    totalRevenue,
    productCosts,
    adsSpend,
    budgetUsed,
    totalCosts,
    grossProfit,
    netProfit,
    profitMargin,
    orderCount: orders.length,
    adReceiptsCount: adsReceipts.length,
    promotionSavings: 0, // Can be enhanced later
  };
}
