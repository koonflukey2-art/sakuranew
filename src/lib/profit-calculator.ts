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
