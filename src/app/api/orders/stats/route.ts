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
        today: { revenue: 0, orders: 0, profit: 0, expense: 0, byType: {} },
        week: { revenue: 0, orders: 0, profit: 0, expense: 0, byType: {}, daily: [] },
      });
    }

    // Fetch products for cost calculation
    const products = await prisma.product.findMany({
      where: { organizationId: orgId },
    });

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

    // Calculate profit and expense
    const calculateStats = (orders: any[]) => {
      let revenue = 0;
      let expense = 0;
      let profit = 0;

      orders.forEach((order) => {
        revenue += order.amount;

        // Find product cost
        const product = products.find((p) => p.productType === order.productType);

        if (product) {
          const orderExpense = product.costPrice * order.quantity;
          expense += orderExpense;
          // Calculate profit: (unitPrice or amount/quantity) * quantity - expense
          const unitPrice = order.unitPrice || order.amount / (order.quantity || 1);
          profit += unitPrice * order.quantity - orderExpense;
        }
      });

      return { revenue, expense, profit, orders: orders.length };
    };

    // Today stats
    const todayStats = calculateStats(todayOrders);

    // Week stats
    const weekStats = calculateStats(weekOrders);

    // Daily breakdown for chart (last 7 days)
    const dailyStats = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const dayOrders = weekOrders.filter(
        (o) => o.orderDate >= date && o.orderDate < nextDate
      );

      const dayStats = calculateStats(dayOrders);

      dailyStats.push({
        date: date.toLocaleDateString("th-TH", { day: "2-digit", month: "short" }),
        revenue: dayStats.revenue,
        expense: dayStats.expense,
        profit: dayStats.profit,
      });
    }

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
        revenue: todayStats.revenue,
        orders: todayStats.orders,
        profit: todayStats.profit,
        expense: todayStats.expense,
        byType: todayByType,
      },
      week: {
        revenue: weekStats.revenue,
        orders: weekStats.orders,
        profit: weekStats.profit,
        expense: weekStats.expense,
        byType: weekByType,
        daily: dailyStats,
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