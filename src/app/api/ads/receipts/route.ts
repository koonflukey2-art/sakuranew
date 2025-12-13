import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

async function getOrganizationId(): Promise<string> {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    select: { organizationId: true },
  });

  return dbUser?.organizationId || "default-org";
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();

    const receipts = await prisma.adReceipt.findMany({
      where: { organizationId: orgId },
      include: {
        campaign: {
          select: {
            campaignName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate totals
    const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);

    // Get total profit from campaigns
    const campaigns = await prisma.adCampaign.findMany({
      where: { organizationId: orgId },
    });

    const totalProfit = campaigns.reduce((sum, c) => sum + c.profit, 0);

    return NextResponse.json({
      receipts,
      totalAmount,
      totalProfit,
    });
  } catch (error) {
    console.error("Failed to fetch receipts:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipts" },
      { status: 500 }
    );
  }
}
