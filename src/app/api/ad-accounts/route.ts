import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const allowedPlatforms = ["FACEBOOK", "TIKTOK", "SHOPEE", "LAZADA"] as const;
type AllowedPlatform = (typeof allowedPlatforms)[number];

interface AdAccountPayload {
  platform?: string;
  accountName?: string; // ✅ แก้จาก name เป็น accountName ตาม schema
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

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.adAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
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
    return NextResponse.json(
      { error: "Failed to fetch ad accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        userId: user.id,
        platform,
        accountName, // ✅ ใช้ accountName แทน name
        apiKey: body.apiKey?.trim() || null,
        apiSecret: body.apiSecret?.trim() || null,
        accessToken: body.accessToken?.trim() || null,
        refreshToken: body.refreshToken?.trim() || null,
        accountId: body.accountId?.trim() || null,
        isActive: body.isActive ?? true,
        isValid: false, // ✅ เริ่มต้นเป็น false เพราะยังไม่ได้ test
        isDefault: false,
        lastTested: null, // ✅ ยังไม่ได้ test ให้เป็น null
        testMessage: null, // ✅ ยังไม่มี message
        currency: "THB", // ตั้งค่าเริ่มต้น
        timezone: "Asia/Bangkok", // ตั้งค่าเริ่มต้น
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating ad account", error);
    return NextResponse.json(
      { error: "Failed to create ad account" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AdAccountPayload & { id: string } = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "กรุณาระบุ ID" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า account นี้เป็นของ user นี้หรือไม่
    const existing = await prisma.adAccount.findFirst({
      where: {
        id: body.id,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "ไม่พบบัญชีนี้" },
        { status: 404 }
      );
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
    return NextResponse.json(
      { error: "Failed to update ad account" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "กรุณาระบุ ID" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า account นี้เป็นของ user นี้หรือไม่
    const existing = await prisma.adAccount.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "ไม่พบบัญชีนี้" },
        { status: 404 }
      );
    }

    await prisma.adAccount.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ad account", error);
    return NextResponse.json(
      { error: "Failed to delete ad account" },
      { status: 500 }
    );
  }
}