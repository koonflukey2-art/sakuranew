import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const allowedPlatforms = ["FACEBOOK", "TIKTOK", "SHOPEE", "LAZADA"] as const;
type AllowedPlatform = (typeof allowedPlatforms)[number];

interface AdAccountPayload {
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
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!platform || !name) {
      return NextResponse.json(
        { error: "กรุณาระบุ platform และชื่อบัญชีให้ถูกต้อง" },
        { status: 400 }
      );
    }

    const created = await prisma.adAccount.create({
      data: {
        userId: user.id,
        platform,
        name,
        apiKey: body.apiKey?.trim() || null,
        apiSecret: body.apiSecret?.trim() || null,
        accessToken: body.accessToken?.trim() || null,
        refreshToken: body.refreshToken?.trim() || null,
        accountId: body.accountId?.trim() || null,
        pixelOrTrackingId: body.pixelOrTrackingId?.trim() || null,
        isActive: body.isActive ?? true,
        lastTested: true,
        testMessage: true,
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
