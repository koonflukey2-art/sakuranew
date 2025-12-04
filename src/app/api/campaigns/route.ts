// src/app/api/campaigns/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ชนิดข้อมูลที่ฝั่ง frontend น่าจะส่งมา
interface CreateCampaignBody {
  platform: string;           // e.g. "FACEBOOK", "GOOGLE", "TIKTOK", "LINE"
  campaignName: string;
  budget: number;
  startDate?: string;
  endDate?: string | null;
  adAccountId?: string | null;

  // optional metrics (ถ้ามี)
  spent?: number;
  reach?: number;
  clicks?: number;
  conversions?: number;
  roi?: number;
  status?: "ACTIVE" | "PAUSED" | "COMPLETED";
}

interface UpdateCampaignBody extends Partial<CreateCampaignBody> {
  id: string;
}

// map platform ให้เป็น enum AdPlatform ของ Prisma
function normalizePlatform(raw: string): string {
  const p = (raw || "").toUpperCase();
  if (p.includes("FACEBOOK")) return "FACEBOOK";
  if (p.includes("GOOGLE")) return "GOOGLE";
  if (p.includes("TIKTOK")) return "TIKTOK";
  if (p.includes("LINE")) return "LINE";
  // fallback เผื่อมาจาก enum อยู่แล้ว
  return p || "FACEBOOK";
}

// ---------------- GET: list campaigns ----------------
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.organizationId) {
      // ไม่มี org ก็ให้ส่ง array ว่างกลับไปจะได้ไม่ error
      return NextResponse.json([]);
    }

    const campaigns = await prisma.adCampaign.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        adAccount: {
          select: {
            id: true,
            platform: true,
            accountName: true,
          },
        },
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("GET /api/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

// ---------------- POST: create campaign ----------------
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CreateCampaignBody;

    if (!body.campaignName || !body.platform || body.budget == null) {
      return NextResponse.json(
        { error: "Missing required fields: campaignName, platform, budget" },
        { status: 400 }
      );
    }

    const platform = normalizePlatform(body.platform);

    const campaign = await prisma.adCampaign.create({
      data: {
        campaignName: body.campaignName,
        platform,
        budget: Number(body.budget) || 0,
        spent: Number(body.spent) || 0,
        reach: Number(body.reach) || 0,
        clicks: Number(body.clicks) || 0,
        conversions: Number(body.conversions) || 0,
        roi: Number(body.roi) || 0,
        status: (body.status as any) || "ACTIVE",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        organizationId: user.organizationId,
        adAccountId: body.adAccountId || null,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("POST /api/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}

// ---------------- PUT: update campaign ----------------
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as UpdateCampaignBody;
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.adCampaign.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const data: any = {};

    if (body.campaignName !== undefined) data.campaignName = body.campaignName;
    if (body.platform !== undefined)
      data.platform = normalizePlatform(body.platform);
    if (body.budget !== undefined) data.budget = Number(body.budget) || 0;
    if (body.spent !== undefined) data.spent = Number(body.spent) || 0;
    if (body.reach !== undefined) data.reach = Number(body.reach) || 0;
    if (body.clicks !== undefined) data.clicks = Number(body.clicks) || 0;
    if (body.conversions !== undefined)
      data.conversions = Number(body.conversions) || 0;
    if (body.roi !== undefined) data.roi = Number(body.roi) || 0;
    if (body.status !== undefined) data.status = body.status as any;
    if (body.startDate !== undefined)
      data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined)
      data.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.adAccountId !== undefined)
      data.adAccountId = body.adAccountId || null;

    const updated = await prisma.adCampaign.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

// ---------------- DELETE: delete campaign ----------------
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.adCampaign.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    await prisma.adCampaign.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
