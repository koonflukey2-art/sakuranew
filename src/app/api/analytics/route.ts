import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // ช่วงก่อนหน้า
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    // products ของ user นี้
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

    // แคมเปญของ user นี้ (ใช้ AdCampaign ตาม schema จริง)
    const campaigns = await prisma.adCampaign.findMany({
      where: { userId: user.id },
    });

    const currentCampaigns = campaigns.filter(
      (c) => new Date(c.startDate) >= startDate
    );

    // ===== คำนวณ overview =====

    const totalRevenue = products.reduce((sum, p) => {
      const sellPrice = p.sellPrice ?? 0;
      const quantity = p.quantity ?? 0;
      return sum + sellPrice * quantity;
    }, 0);

    const currentRevenue = currentProducts.reduce((sum, p) => {
      const sellPrice = p.sellPrice ?? 0;
      const quantity = p.quantity ?? 0;
      return sum + sellPrice * quantity;
    }, 0);

    const previousRevenue = previousProducts.reduce((sum, p) => {
      const sellPrice = p.sellPrice ?? 0;
      const quantity = p.quantity ?? 0;
      return sum + sellPrice * quantity;
    }, 0);

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

    // ===== Top products =====
    const topProducts = products
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        revenue: (p.sellPrice ?? 0) * (p.quantity ?? 0),
        quantity: p.quantity ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ===== Top categories =====
    const categoryRevenue = products.reduce((acc, p) => {
      const category = p.category || "ไม่ระบุ";
      const revenue = (p.sellPrice ?? 0) * (p.quantity ?? 0);
      acc[category] = (acc[category] || 0) + revenue;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryRevenue)
      .map(([category, revenue]) => ({
        category,
        revenue,
        percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ===== Revenue by month (จาก createdAt ของ product) =====
    const monthlyRevenue: Record<string, number> = {};
    products.forEach((p) => {
      const month = new Date(p.createdAt).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
      });
      const revenue = (p.sellPrice ?? 0) * (p.quantity ?? 0);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + revenue;
    });

    const revenueByMonth = Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({ month, revenue }))
      .slice(-6);

    // ===== Campaign performance =====
    const campaignPerformance = currentCampaigns.map((c) => ({
      platform: c.platform,
      spent: c.spent ?? 0,
      roi: c.roi ?? 0,
      conversions: c.conversions ?? 0,
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
