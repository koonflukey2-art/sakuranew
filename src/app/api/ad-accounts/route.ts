import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const allowedPlatforms = ["FACEBOOK", "TIKTOK", "SHOPEE", "LAZADA", "GOOGLE", "LINE"] as const;
type AllowedPlatform = (typeof allowedPlatforms)[number];

interface AdAccountPayload {
  platform?: string;
  accountName?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
  isActive?: boolean;
}

function normalizePlatform(value?: string): AllowedPlatform | null {
  const upper = typeof value === "string" ? value.toUpperCase() : "";
  return allowedPlatforms.includes(upper as AllowedPlatform)
    ? (upper as AllowedPlatform)
    : null;
}

// =======================
// GET - ดึงข้อมูลทั้งหมด
// =======================
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!user.organizationId) {
      return NextResponse.json({ error: "User has no organization" }, { status: 403 });
    }

    const accounts = await prisma.adAccount.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        organizationId: true,
        platform: true,
        accountName: true,
        accountId: true,
        isActive: true,
        isValid: true,
        isDefault: true,
        lastTested: true,
        testMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Error fetching ad accounts", error);
    return NextResponse.json({ error: "Failed to fetch ad accounts" }, { status: 500 });
  }
}

// =======================
// POST - เพิ่มบัญชีใหม่
// =======================
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!user.organizationId) {
      return NextResponse.json({ error: "User has no organization" }, { status: 403 });
    }

    const body: AdAccountPayload = await request.json();

    const platform = normalizePlatform(body.platform);
    const accountName = typeof body.accountName === "string" ? body.accountName.trim() : "";

    if (!platform || !accountName) {
      return NextResponse.json(
        { error: "กรุณาระบุ platform และชื่อบัญชีให้ถูกต้อง" },
        { status: 400 }
      );
    }

    const created = await prisma.adAccount.create({
      data: {
        organizationId: user.organizationId,
        platform,
        accountName,
        apiKey: body.apiKey?.trim() || null,
        apiSecret: body.apiSecret?.trim() || null,
        accessToken: body.accessToken?.trim() || null,
        refreshToken: body.refreshToken?.trim() || null,
        accountId: body.accountId?.trim() || null,
        isActive: body.isActive ?? true,
        isValid: false,
        isDefault: false,
        lastTested: null,
        testMessage: null,
        currency: "THB",
        timezone: "Asia/Bangkok",
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating ad account", error);
    return NextResponse.json({ error: "Failed to create ad account" }, { status: 500 });
  }
}

// =======================
// PUT - อัปเดตบัญชี
// =======================
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: AdAccountPayload & { id: string } = await request.json();
    if (!body.id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const existing = await prisma.adAccount.findFirst({
      where: {
        id: body.id,
        organizationId: user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "ไม่พบบัญชีนี้" }, { status: 404 });
    }

    const platform = normalizePlatform(body.platform);

    const updated = await prisma.adAccount.update({
      where: { id: body.id },
      data: {
        platform: platform || existing.platform,
        accountName: body.accountName?.trim() || existing.accountName,
        apiKey: body.apiKey?.trim() || existing.apiKey,
        apiSecret: body.apiSecret?.trim() || existing.apiSecret,
        accessToken: body.accessToken?.trim() || existing.accessToken,
        refreshToken: body.refreshToken?.trim() || existing.refreshToken,
        accountId: body.accountId?.trim() || existing.accountId,
        isActive: body.isActive ?? existing.isActive,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating ad account", error);
    return NextResponse.json({ error: "Failed to update ad account" }, { status: 500 });
  }
}

// =======================
// DELETE - ลบบัญชี
// =======================
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const existing = await prisma.adAccount.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "ไม่พบบัญชีนี้" }, { status: 404 });
    }

    await prisma.adAccount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ad account", error);
    return NextResponse.json({ error: "Failed to delete ad account" }, { status: 500 });
  }
}
