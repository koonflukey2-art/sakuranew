import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";

// GET: Get average selling prices by product type from orders
export async function GET(request: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({});
    }

    // Get all orders grouped by product type
    const orders = await prisma.order.findMany({
      where: {
        organizationId: orgId,
        productType: { not: null },
        unitPrice: { gt: 0 },
      },
      select: {
        productType: true,
        unitPrice: true,
      },
    });

    // Calculate average price per product type
    const pricesByType: Record<number, number[]> = {};

    orders.forEach((order) => {
      if (order.productType) {
        if (!pricesByType[order.productType]) {
          pricesByType[order.productType] = [];
        }
        pricesByType[order.productType].push(order.unitPrice);
      }
    });

    // Calculate averages
    const averagePrices: Record<number, number> = {};

    Object.entries(pricesByType).forEach(([type, prices]) => {
      const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      averagePrices[parseInt(type)] = Math.round(avg);
    });

    return NextResponse.json(averagePrices);
  } catch (error: any) {
    console.error("GET /api/products/prices error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
