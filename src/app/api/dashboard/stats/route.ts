import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";

export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({
        profit: 0,
        revenue: 0,
        cost: 0,
        orders: 0,
        conversions: 0,
        profitMargin: 0,
      });
    }

    const [orders, products] = await Promise.all([
      prisma.order.findMany({
        where: { organizationId: orgId },
        include: { customer: true },
      }),
      prisma.product.findMany({
        where: { organizationId: orgId },
      }),
    ]);

    const revenue = orders.reduce((sum, order) => sum + order.amount, 0);

    let totalCost = 0;
    for (const order of orders) {
      const product = products.find((p) => p.productType === order.productType);
      if (product) {
        totalCost += product.costPrice * order.quantity;
      }
    }

    const profit = revenue - totalCost;
    const orderCount = orders.length;
    const conversions = orders.filter((o) => o.status === "COMPLETED").length;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return NextResponse.json({
      profit,
      revenue,
      cost: totalCost,
      orders: orderCount,
      conversions,
      profitMargin,
    });
  } catch (error: any) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
