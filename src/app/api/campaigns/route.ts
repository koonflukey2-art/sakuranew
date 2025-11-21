import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const campaigns = await prisma.adCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const campaign = await prisma.adCampaign.create({
      data: {
        platform: body.platform,
        campaignName: body.campaignName,
        budget: body.budget,
        spent: body.spent || 0,
        reach: body.reach || 0,
        clicks: body.clicks || 0,
        conversions: body.conversions || 0,
        roi: body.roi || 0,
        status: body.status || "ACTIVE",
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        userId: body.userId || "temp-user-id", // TODO: Get from session
      },
    });
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Failed to create campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const campaign = await prisma.adCampaign.update({
      where: { id: body.id },
      data: {
        campaignName: body.campaignName,
        budget: body.budget,
        spent: body.spent,
        reach: body.reach,
        clicks: body.clicks,
        conversions: body.conversions,
        roi: body.roi,
        status: body.status,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });
    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Failed to update campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}
