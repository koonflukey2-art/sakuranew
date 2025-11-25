import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

interface AdAccountUpdatePayload {
  platform?: string;
  accountName?: string;
  accountId?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  currency?: string;
  timezone?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

async function findUserAdAccount(id: string, userId: string) {
  return prisma.adAccount.findFirst({ where: { id, userId } });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    if (typeof body.platform === "string") updateData.platform = body.platform;
    if (typeof body.accountName === "string") updateData.accountName = body.accountName.trim();
    if (typeof body.accountId === "string") updateData.accountId = body.accountId.trim();
    if (typeof body.apiKey === "string") updateData.apiKey = encrypt(body.apiKey.trim());
    if (typeof body.apiSecret === "string") updateData.apiSecret = body.apiSecret ? encrypt(body.apiSecret.trim()) : null;
    if (typeof body.accessToken === "string")
      updateData.accessToken = body.accessToken ? encrypt(body.accessToken.trim()) : null;
    if (typeof body.refreshToken === "string")
      updateData.refreshToken = body.refreshToken ? encrypt(body.refreshToken.trim()) : null;
    if (typeof body.currency === "string") updateData.currency = body.currency;
    if (typeof body.timezone === "string") updateData.timezone = body.timezone;
    if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;
    if (typeof body.isDefault === "boolean") updateData.isDefault = body.isDefault;

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
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
