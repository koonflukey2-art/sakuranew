import { NextResponse } from "next/server";
import { AdPlatform } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface AdAccountUpdatePayload {
  platform?: string;
  name?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
  pixelOrTrackingId?: string;
  isActive?: boolean;
}

function normalizePlatform(value?: string): AdPlatform | null {
  const upper = typeof value === "string" ? value.toUpperCase() : "";
  return Object.values(AdPlatform).includes(upper as AdPlatform)
    ? (upper as AdPlatform)
    : null;
}

async function findUserAdAccount(id: string, userId: string) {
  return prisma.adAccount.findFirst({ where: { id, userId } });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const existing = await findUserAdAccount(id, user.id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body: AdAccountUpdatePayload = await request.json();

    const updateData: Record<string, any> = {};

    if (body.platform) {
      const platform = normalizePlatform(body.platform);
      if (!platform) {
        return NextResponse.json({ error: "platform ไม่ถูกต้อง" }, { status: 400 });
      }
      updateData.platform = platform;
    }

    if (typeof body.name === "string") updateData.name = body.name.trim();
    if (typeof body.apiKey === "string") updateData.apiKey = body.apiKey.trim();
    if (typeof body.apiSecret === "string") updateData.apiSecret = body.apiSecret.trim();
    if (typeof body.accessToken === "string") updateData.accessToken = body.accessToken.trim();
    if (typeof body.refreshToken === "string") updateData.refreshToken = body.refreshToken.trim();
    if (typeof body.accountId === "string") updateData.accountId = body.accountId.trim();
    if (typeof body.pixelOrTrackingId === "string")
      updateData.pixelOrTrackingId = body.pixelOrTrackingId.trim();
    if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;

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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const existing = await findUserAdAccount(id, user.id);
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
