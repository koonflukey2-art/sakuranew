import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";

export const runtime = "nodejs";

// POST - Trigger manual cut-off (creates daily summary)
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    // Get today's date range
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Check if summary already exists for today
    const existingSummary = await prisma.dailySummary.findFirst({
      where: {
        organizationId: orgId,
        date: startOfDay,
      },
    });

    if (existingSummary) {
      return NextResponse.json(
        { error: "Daily summary already exists for today" },
        { status: 400 }
      );
    }

    // Fetch all orders for today
    const orders = await prisma.order.findMany({
      where: {
        organizationId: orgId,
        orderDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    // Fetch all products for cost calculation
    const products = await prisma.product.findMany({
      where: { organizationId: orgId },
    });

    // Calculate metrics
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    const productBreakdown: Record<string, any> = {};

    orders.forEach((order) => {
      totalRevenue += order.amount;

      // Find product to get cost
      const product = products.find((p) => p.productType === order.productType);
      const costPrice = product ? product.costPrice : 0;
      const cost = costPrice * order.quantity;
      totalCost += cost;
      totalProfit += order.amount - cost;

      // Build product breakdown
      const key = order.productType?.toString() || "unknown";
      if (!productBreakdown[key]) {
        productBreakdown[key] = {
          productType: order.productType,
          productName: product?.name || order.productName || `สินค้าหมายเลข ${order.productType}`,
          quantity: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
      }

      productBreakdown[key].quantity += order.quantity;
      productBreakdown[key].revenue += order.amount;
      productBreakdown[key].cost += cost;
      productBreakdown[key].profit += order.amount - cost;
    });

    // Create daily summary
    const summary = await prisma.dailySummary.create({
      data: {
        date: startOfDay,
        organizationId: orgId,
        totalRevenue,
        totalCost,
        totalProfit,
        totalOrders: orders.length,
        productsSold: Object.values(productBreakdown),
        cutOffTime: now,
      },
    });

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Daily cut-off error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create daily summary" },
      { status: 500 }
    );
  }
}

// GET - Fetch daily summaries with filters
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json([], { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const days = searchParams.get("days");

    let where: any = { organizationId: orgId };

    if (from && to) {
      where.date = {
        gte: new Date(from),
        lte: new Date(to),
      };
    } else if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      where.date = { gte: daysAgo };
    }

    const summaries = await prisma.dailySummary.findMany({
      where,
      orderBy: { date: "desc" },
      take: 100, // Limit to 100 most recent
    });

    return NextResponse.json(summaries);
  } catch (error: any) {
    console.error("GET daily summaries error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch summaries" },
      { status: 500 }
    );
  }
}
