import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";
import { getProductTypeName } from "@/lib/line-parser";

export const runtime = "nodejs";

export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({
        today: { revenue: 0, orders: 0, byType: {} },
        week: { revenue: 0, orders: 0, byType: {} },
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

    // Group by product type
    const todayByType: Record<string, { count: number; revenue: number }> = {};
    const weekByType: Record<string, { count: number; revenue: number }> = {};

    todayOrders.forEach((order) => {
      const typeName = order.productType
        ? getProductTypeName(order.productType)
        : "ไม่ระบุ";

      if (!todayByType[typeName]) {
        todayByType[typeName] = { count: 0, revenue: 0 };
      }
      todayByType[typeName].count += order.quantity;
      todayByType[typeName].revenue += order.amount;
    });

    weekOrders.forEach((order) => {
      const typeName = order.productType
        ? getProductTypeName(order.productType)
        : "ไม่ระบุ";

      if (!weekByType[typeName]) {
        weekByType[typeName] = { count: 0, revenue: 0 };
      }
      weekByType[typeName].count += order.quantity;
      weekByType[typeName].revenue += order.amount;
    });

    return NextResponse.json({
      today: {
        revenue: todayRevenue,
        orders: todayOrders.length,
        byType: todayByType,
      },
      week: {
        revenue: weekRevenue,
        orders: weekOrders.length,
        byType: weekByType,
      },
    });
  } catch (error: any) {
    console.error("GET /api/orders/stats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}