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
        today: { revenue: 0, orders: 0 },
        week: { revenue: 0, orders: 0 },
        byQuantity: {},
      });
    }

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await prisma.order.findMany({
      where: {
        organizationId: orgId,
        orderDate: {
          gte: today,
        },
      },
    });

    // Last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekOrders = await prisma.order.findMany({
      where: {
        organizationId: orgId,
        orderDate: {
          gte: weekAgo,
        },
      },
    });

    // Calculate stats
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.amount, 0);
    const weekRevenue = weekOrders.reduce((sum, o) => sum + o.amount, 0);

    // Orders by quantity
    const byQuantity: Record<number, number> = {};
    weekOrders.forEach((order) => {
      const qty = order.quantity;
      byQuantity[qty] = (byQuantity[qty] || 0) + 1;
    });

    return NextResponse.json({
      today: {
        revenue: todayRevenue,
        orders: todayOrders.length,
      },
      week: {
        revenue: weekRevenue,
        orders: weekOrders.length,
      },
      byQuantity,
    });
  } catch (error: any) {
    console.error("GET /api/orders/stats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
