import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET: Fetch aggregated ad analytics
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build filter
    const filter: any = {
      userId: user.id,
    };

    if (platform && platform !== "ALL") {
      filter.platform = platform;
    }

    if (startDate) {
      filter.startDate = {
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      filter.endDate = {
        lte: new Date(endDate),
      };
    }

    // Fetch campaigns
    const campaigns = await prisma.adCampaign.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
    });

    // Calculate aggregated metrics
    const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
    const totalReach = campaigns.reduce((sum, c) => sum + c.reach, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
    const avgROI = campaigns.length > 0
      ? campaigns.reduce((sum, c) => sum + c.roi, 0) / campaigns.length
      : 0;

    const ctr = totalReach > 0 ? (totalClicks / totalReach) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
    const cpa = totalConversions > 0 ? totalSpent / totalConversions : 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Group by platform
    const byPlatform = campaigns.reduce((acc: any, campaign) => {
      const platform = campaign.platform;
      if (!acc[platform]) {
        acc[platform] = {
          platform,
          campaigns: 0,
          budget: 0,
          spent: 0,
          reach: 0,
          clicks: 0,
          conversions: 0,
          roi: 0,
        };
      }

      acc[platform].campaigns += 1;
      acc[platform].budget += campaign.budget;
      acc[platform].spent += campaign.spent;
      acc[platform].reach += campaign.reach;
      acc[platform].clicks += campaign.clicks;
      acc[platform].conversions += campaign.conversions;
      acc[platform].roi += campaign.roi;

      return acc;
    }, {});

    // Calculate averages for each platform
    Object.values(byPlatform).forEach((platform: any) => {
      platform.roi = platform.campaigns > 0 ? platform.roi / platform.campaigns : 0;
      platform.ctr = platform.reach > 0 ? (platform.clicks / platform.reach) * 100 : 0;
      platform.cpc = platform.clicks > 0 ? platform.spent / platform.clicks : 0;
      platform.cpa = platform.conversions > 0 ? platform.spent / platform.conversions : 0;
    });

    // Group by status
    const byStatus = campaigns.reduce((acc: any, campaign) => {
      const status = campaign.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Recent campaigns (top 10)
    const recentCampaigns = campaigns.slice(0, 10).map((c) => ({
      id: c.id,
      name: c.campaignName,
      platform: c.platform,
      status: c.status,
      budget: c.budget,
      spent: c.spent,
      roi: c.roi,
      conversions: c.conversions,
      startDate: c.startDate,
    }));

    // Best performing campaigns (by ROI)
    const topPerforming = [...campaigns]
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: c.campaignName,
        platform: c.platform,
        roi: c.roi,
        spent: c.spent,
        conversions: c.conversions,
      }));

    return NextResponse.json({
      summary: {
        totalCampaigns: campaigns.length,
        totalBudget,
        totalSpent,
        totalReach,
        totalClicks,
        totalConversions,
        avgROI,
        ctr,
        cpc,
        cpa,
        conversionRate,
        budgetRemaining: totalBudget - totalSpent,
        budgetUsedPercent: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      },
      byPlatform: Object.values(byPlatform),
      byStatus,
      recentCampaigns,
      topPerforming,
    });
  } catch (error) {
    console.error("Error fetching ad analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch ad analytics" },
      { status: 500 }
    );
  }
}
