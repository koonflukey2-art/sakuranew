// src/app/api/ad-accounts/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ต้องให้ตรงกับ enum AdPlatform ใน schema
const allowedPlatforms = ["FACEBOOK", "GOOGLE", "TIKTOK", "LINE"] as const;
type AllowedPlatform = (typeof allowedPlatforms)[number];

interface AdAccountUpdatePayload {
  platform?: string;
  // frontend อาจส่งมาว่า name หรือ accountName ก็รองรับทั้งคู่
  name?: string;
  accountName?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
  isActive?: boolean;
}

function normalizePlatform(value?: string): AllowedPlatform | null {
  const upper = typeof value === "string" ? value.toUpperCase().trim() : "";
  return allowedPlatforms.includes(upper as AllowedPlatform)
    ? (upper as AllowedPlatform)
    : null;
}

async function findOrgAdAccount(id: string, organizationId: string) {
  return prisma.adAccount.findFirst({
    where: { id, organizationId },
  });
}

// =======================
// PUT - อัปเดตบัญชี
// =======================
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: "User has no organization" },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const existing = await findOrgAdAccount(id, user.organizationId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body: AdAccountUpdatePayload = await request.json();
    const updateData: Record<string, any> = {};

    // platform
    if (body.platform) {
      const platform = normalizePlatform(body.platform);
      if (!platform) {
        return NextResponse.json(
          { error: "platform ไม่ถูกต้อง" },
          { status: 400 }
        );
      }
      updateData.platform = platform;
    }

    // ชื่อบัญชี (map จาก name หรือ accountName → accountName ใน DB)
    const rawName =
      typeof body.accountName === "string"
        ? body.accountName
        : typeof body.name === "string"
        ? body.name
        : undefined;

    if (typeof rawName === "string") {
      updateData.accountName = rawName.trim();
    }

    if (typeof body.apiKey === "string") {
      updateData.apiKey = body.apiKey.trim();
    }
    if (typeof body.apiSecret === "string") {
      updateData.apiSecret = body.apiSecret.trim();
    }
    if (typeof body.accessToken === "string") {
      updateData.accessToken = body.accessToken.trim();
    }
    if (typeof body.refreshToken === "string") {
      updateData.refreshToken = body.refreshToken.trim();
    }
    if (typeof body.accountId === "string") {
      updateData.accountId = body.accountId.trim();
    }
    if (typeof body.isActive === "boolean") {
      updateData.isActive = body.isActive;
    }

    const updated = await prisma.adAccount.update({
      where: { id: existing.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating ad account", error);
    return NextResponse.json(
      { error: "Failed to update ad account" },
      { status: 500 }
    );
  }
}

// =======================
// DELETE - ลบบัญชี
// =======================
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: "User has no organization" },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const existing = await findOrgAdAccount(id, user.organizationId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.adAccount.delete({ where: { id: existing.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ad account", error);
    return NextResponse.json(
      { error: "Failed to delete ad account" },
      { status: 500 }
    );
  }
}
