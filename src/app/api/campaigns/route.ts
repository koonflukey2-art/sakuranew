import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

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
    // Get current Clerk user
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user in database by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database. Please sync your account first." },
        { status: 404 }
      );
    }

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
        userId: user.id, // Use database user ID
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
    // Get current Clerk user
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

export async function DELETE(request: Request) {
  try {
    // Get current Clerk user
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.adCampaign.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
