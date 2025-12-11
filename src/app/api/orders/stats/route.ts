import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";
import { getProductTypeName } from "@/lib/line-parser";
import { calculateTotalProfit } from "@/lib/profit-calculator";

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

    // Calculate profit and expense with promotion-aware cost
    const calculateStats = async (orders: any[]) => {
      const profitCalc = await calculateTotalProfit(
        orders.map((order) => ({
          productType: order.productType,
          quantity: order.quantity,
          amount: order.amount,
        })),
        orgId
      );

      return {
        revenue: profitCalc.revenue,
        expense: profitCalc.cost,
        profit: profitCalc.profit,
        margin: profitCalc.margin,
        orders: orders.length,
      };
    };

    const todayStats = await calculateStats(todayOrders);
    const weekStats = await calculateStats(weekOrders);

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

      const dayStats = await calculateStats(dayOrders);

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

    const budget = await prisma.capitalBudget.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      today: {
        revenue: todayStats.revenue,
        orders: todayStats.orders,
        profit: todayStats.profit,
        expense: todayStats.expense,
        margin: todayStats.margin,
        byType: todayByType,
      },
      week: {
        revenue: weekStats.revenue,
        orders: weekStats.orders,
        profit: weekStats.profit,
        expense: weekStats.expense,
        margin: weekStats.margin,
        byType: weekByType,
        daily: dailyStats,
      },
      budget: {
        total: budget?.amount || 0,
        used: budget ? budget.amount - budget.remaining : 0,
        remaining: budget?.remaining || 0,
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