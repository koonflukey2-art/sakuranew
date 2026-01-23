import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VAT_RATE = 0.07;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // ✅ เปลี่ยน orderBy เป็น createdAt (กันพังถ้าไม่มี orderDate)
    const [orders, products, promotions] = await Promise.all([
      prisma.order.findMany({
        where: { organizationId, status: { in: ["PENDING","CONFIRMED","COMPLETED"] } },
        select: {
          id: true,
          productType: true,
          productName: true,
          quantity: true,
          amount: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.findMany({
        where: { organizationId },
        select: { id: true, name: true, productType: true, costPrice: true },
      }),
      prisma.promotion.findMany({
        where: { organizationId, isActive: true },
        select: {
          productId: true,
          buyQuantity: true,
          freeQuantity: true,
          discountPercent: true,
          discountAmount: true,
        },
      }),
    ]);

    const productByType = new Map<number, (typeof products)[number]>();
    for (const product of products) productByType.set(product.productType, product);

    const promotionByProductId = new Map<string, (typeof promotions)[number]>();
    for (const promotion of promotions) promotionByProductId.set(promotion.productId, promotion);

    const totals = {
      grossRevenue: 0,
      discountTotal: 0,
      netRevenue: 0,
      vatAmount: 0,
      revenueAfterVat: 0,
      productCosts: 0,
      grossProfit: 0,
      grossProfitAfterVat: 0,
      orderCount: orders.length,
    };

    const productBreakdown = new Map<
      string,
      {
        id: string;
        name: string;
        quantity: number;
        revenue: number;
        discount: number;
        netRevenue: number;
        cost: number;
        profit: number;
        margin: number;
      }
    >();

    for (const order of orders) {
      const product = order.productType ? productByType.get(order.productType) : undefined;
      const promotion = product ? promotionByProductId.get(product.id) : undefined;

            // ✅ คิดกำไรใน route เลย (กัน calc พัง / ไม่มี OrderItem)
      const qty = Number(order.quantity ?? 0) || 0;
      const revenue = Number(order.amount ?? 0) || 0;

      // ส่วนลด (ถ้ามี)
      const discountPercent = Number(promotion?.discountPercent ?? 0) || 0;
      const discountAmountFixed = Number(promotion?.discountAmount ?? 0) || 0;
      let discount = 0;
      if (discountPercent > 0) discount = revenue * (discountPercent / 100);
      if (discountAmountFixed > 0) discount = Math.max(discount, discountAmountFixed);
      if (!Number.isFinite(discount) || discount < 0) discount = 0;
      if (discount > revenue) discount = revenue;

      const netRevenue = revenue - discount;

      // ต้นทุน + ของแถม buy/free (โปรร้านแถมเอง)
      const baseCost = Number(product?.costPrice ?? 0) || 0;
      const buyQty = Math.max(0, Math.floor(Number(promotion?.buyQuantity ?? 0) || 0));
      const freeQty = Math.max(0, Math.floor(Number(promotion?.freeQuantity ?? 0) || 0));
      const freeGiven = buyQty > 0 && freeQty > 0 ? Math.floor(qty / buyQty) * freeQty : 0;

      const cost = baseCost > 0 ? baseCost * (Math.max(0, qty) + freeGiven) : 0;
      const profit = netRevenue - cost;

      totals.grossRevenue += revenue;
      totals.discountTotal += discount;
      totals.netRevenue += netRevenue;
      totals.productCosts += cost;
      totals.grossProfit += profit;

const key = product?.id ?? `unknown-${order.productType ?? "none"}`;
      const name = product?.name || order.productName || "สินค้าอื่นๆ";
      const quantity = Number(order.quantity) || 0;

      const current = productBreakdown.get(key) ?? {
        id: key,
        name,
        quantity: 0,
        revenue: 0,
        discount: 0,
        netRevenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
      };

      current.quantity += quantity;
      current.revenue += revenue;
      current.discount += discount;
      current.netRevenue += netRevenue;
      current.cost += cost;
      current.profit += profit;
      current.margin = current.netRevenue === 0 ? 0 : (current.profit / current.netRevenue) * 100;

      productBreakdown.set(key, current);
    }

    totals.vatAmount = totals.netRevenue * VAT_RATE;
    totals.revenueAfterVat = totals.netRevenue - totals.vatAmount;
    totals.grossProfitAfterVat = totals.revenueAfterVat - totals.productCosts;

    return NextResponse.json({
      totals,
      products: Array.from(productBreakdown.values()).sort((a, b) => b.profit - a.profit),
    });
  } catch (error: any) {
    console.error("Failed to build profit summary:", error);
    // ✅ สำคัญ: ส่ง detail ออกไปดูสาเหตุจริง
    return NextResponse.json(
      {
        error: "Failed to build profit summary",
        detail: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
