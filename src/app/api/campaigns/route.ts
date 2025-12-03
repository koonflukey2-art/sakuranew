import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/organization";

export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      // No organization yet - return empty array
      return NextResponse.json([]);
    }

    const campaigns = await prisma.adCampaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: {
        organization: {
          select: {
            name: true,
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

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found. Please contact support." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const campaign = await prisma.adCampaign.create({
      data: {
        platform: body.platform,
        campaignName: body.campaignName,
        budget: parseFloat(body.budget) || 0,
        spent: parseFloat(body.spent) || 0,
        reach: parseInt(body.reach) || 0,
        clicks: parseInt(body.clicks) || 0,
        conversions: parseInt(body.conversions) || 0,
        roi: parseFloat(body.roi) || 0,
        status: body.status || "ACTIVE",
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        organizationId: orgId, // Use organization ID
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

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const body = await request.json();

    // Verify campaign belongs to organization
    const existing = await prisma.adCampaign.findUnique({
      where: { id: body.id },
    });

    if (!existing || existing.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Campaign not found or access denied" },
        { status: 404 }
      );
    }

    const campaign = await prisma.adCampaign.update({
      where: { id: body.id },
      data: {
        campaignName: body.campaignName,
        budget: parseFloat(body.budget) || 0,
        spent: parseFloat(body.spent) || 0,
        reach: parseInt(body.reach) || 0,
        clicks: parseInt(body.clicks) || 0,
        conversions: parseInt(body.conversions) || 0,
        roi: parseFloat(body.roi) || 0,
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

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // Verify campaign belongs to organization
    const campaign = await prisma.adCampaign.findUnique({
      where: { id },
    });

    if (!campaign || campaign.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Campaign not found or access denied" },
        { status: 404 }
      );
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
