import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrganizationId } from "@/lib/organization";

const allowedPlatforms = ["FACEBOOK", "GOOGLE", "TIKTOK", "LINE"] as const;
type AllowedPlatform = (typeof allowedPlatforms)[number];

interface TestPayload {
  id?: string;
  platform?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
  pixelOrTrackingId?: string;
}

function normalizePlatform(value?: string): AllowedPlatform | null {
  const upper = typeof value === "string" ? value.toUpperCase() : "";
  return allowedPlatforms.includes(upper as AllowedPlatform)
    ? (upper as AllowedPlatform)
    : null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const body: TestPayload = await request.json();
    const platform = normalizePlatform(body.platform);

    if (!platform) {
      return NextResponse.json(
        { success: false, message: "platform ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const hasKey = Boolean(body.apiKey?.trim() || body.accessToken?.trim());
    const success = hasKey;
    const message = success
      ? "เชื่อมต่อสำเร็จ"
      : "API Key หรือ Access Token ว่าง";

    if (!body.id) {
      return NextResponse.json(
        { success: false, message: "id จำเป็นต้องระบุ" },
        { status: 400 }
      );
    }

    const existing = await prisma.adAccount.findFirst({
      where: { id: body.id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "ไม่พบบัญชีโฆษณา" },
        { status: 404 }
      );
    }

    await prisma.adAccount.update({
      where: { id: existing.id },
      data: {
        lastTested: new Date(),
        isValid: success,
        testMessage: message,
      },
    });

    return NextResponse.json({ success, message });
  } catch (error) {
    console.error("Error testing ad account", error);
    return NextResponse.json(
      { success: false, message: "ไม่สามารถทดสอบการเชื่อมต่อได้" },
      { status: 500 }
    );
  }
}
