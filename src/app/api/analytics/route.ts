import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Calculate previous period for comparison
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    // Fetch products
    const products = await prisma.product.findMany({
      where: { userId: user.id },
    });

    const currentProducts = products.filter(
      (p) => new Date(p.createdAt) >= startDate
    );
    const previousProducts = products.filter(
      (p) =>
        new Date(p.createdAt) >= previousStartDate &&
        new Date(p.createdAt) < startDate
    );

    // Fetch campaigns
    const campaigns = await prisma.campaign.findMany({
      where: { userId: user.id },
    });

    const currentCampaigns = campaigns.filter(
      (c) => new Date(c.startDate) >= startDate
    );

    // Calculate analytics
    const totalRevenue = products.reduce(
      (sum, p) => sum + p.sellPrice * p.quantity,
      0
    );
    const currentRevenue = currentProducts.reduce(
      (sum, p) => sum + p.sellPrice * p.quantity,
      0
    );
    const previousRevenue = previousProducts.reduce(
      (sum, p) => sum + p.sellPrice * p.quantity,
      0
    );
    const revenueChange =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    const totalOrders = products.length;
    const currentOrders = currentProducts.length;
    const previousOrders = previousProducts.length;
    const ordersChange =
      previousOrders > 0
        ? ((currentOrders - previousOrders) / previousOrders) * 100
        : 0;

    const totalProducts = products.length;
    const currentProductCount = currentProducts.length;
    const previousProductCount = previousProducts.length;
    const productsChange =
      previousProductCount > 0
        ? ((currentProductCount - previousProductCount) /
            previousProductCount) *
          100
        : 0;

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const currentAvg =
      currentOrders > 0 ? currentRevenue / currentOrders : 0;
    const previousAvg =
      previousOrders > 0 ? previousRevenue / previousOrders : 0;
    const avgOrderChange =
      previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;

    // Top products by revenue
    const topProducts = products
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        revenue: p.sellPrice * p.quantity,
        quantity: p.quantity,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top categories by revenue
    const categoryRevenue = products.reduce((acc, p) => {
      const revenue = p.sellPrice * p.quantity;
      acc[p.category] = (acc[p.category] || 0) + revenue;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryRevenue)
      .map(([category, revenue]) => ({
        category,
        revenue,
        percentage: (revenue / totalRevenue) * 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Revenue by month (simplified - using product creation date)
    const monthlyRevenue: Record<string, number> = {};
    products.forEach((p) => {
      const month = new Date(p.createdAt).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
      });
      const revenue = p.sellPrice * p.quantity;
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + revenue;
    });

    const revenueByMonth = Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({ month, revenue }))
      .slice(-6);

    // Campaign performance
    const campaignPerformance = currentCampaigns.map((c) => ({
      platform: c.platform,
      spent: c.spent,
      roi: c.roi,
      conversions: c.conversions,
    }));

    // Ad metrics aggregation
    const totalAdSpend = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
    const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;

    const roiValues = campaigns
      .map((c) => c.roi)
      .filter((v) => typeof v === "number" && !Number.isNaN(v)) as number[];

    const avgCampaignROI =
      roiValues.length > 0
        ? roiValues.reduce((sum, v) => sum + v, 0) / roiValues.length
        : 0;

    const adPerformanceByPlatform = campaigns.reduce(
      (acc, c) => {
        const key = c.platform || "UNKNOWN";
        if (!acc[key]) {
          acc[key] = {
            platform: key,
            campaigns: 0,
            totalSpend: 0,
            avgROI: 0,
            totalConversions: 0,
          };
        }

        acc[key].campaigns += 1;
        acc[key].totalSpend += c.spent || 0;
        acc[key].totalConversions += c.conversions || 0;

        return acc;
      },
      {} as Record<
        string,
        {
          platform: string;
          campaigns: number;
          totalSpend: number;
          avgROI: number;
          totalConversions: number;
        }
      >
    );

    Object.keys(adPerformanceByPlatform).forEach((key) => {
      const group = adPerformanceByPlatform[key];
      const platformCampaigns = campaigns.filter(
        (c) => (c.platform || "UNKNOWN") === key && typeof c.roi === "number"
      );
      if (platformCampaigns.length > 0) {
        group.avgROI =
          platformCampaigns.reduce((sum, c) => sum + (c.roi || 0), 0) /
          platformCampaigns.length;
      } else {
        group.avgROI = 0;
      }
    });

    const analytics = {
      overview: {
        totalRevenue,
        revenueChange,
        totalOrders,
        ordersChange,
        totalProducts,
        productsChange,
        avgOrderValue,
        avgOrderChange,
        totalAdSpend,
        activeCampaigns,
        avgCampaignROI,
      },
      topProducts,
      topCategories,
      revenueByMonth,
      campaignPerformance,
      adPerformanceByPlatform: Object.values(adPerformanceByPlatform),
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
