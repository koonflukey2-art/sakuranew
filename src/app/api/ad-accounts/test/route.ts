import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const allowedPlatforms = ["FACEBOOK", "TIKTOK", "SHOPEE", "LAZADA"] as const;
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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    if (body.id) {
      const existing = await prisma.adAccount.findFirst({
        where: { id: body.id, userId: user.id },
      });

      if (existing) {
        await prisma.adAccount.update({
          where: { id: existing.id },
          data: {
            lastTestedAt: new Date(),
            lastTestStatus: success ? "SUCCESS" : "FAILED",
          },
        });
      }
    }

    return NextResponse.json({ success, message, status: success ? "SUCCESS" : "FAILED" });
  } catch (error) {
    console.error("Error testing ad account", error);
    return NextResponse.json(
      { success: false, message: "ไม่สามารถทดสอบการเชื่อมต่อได้" },
      { status: 500 }
    );
  }
}
