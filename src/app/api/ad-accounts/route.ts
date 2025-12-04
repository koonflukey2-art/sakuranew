// src/app/api/ad-accounts/test/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// ให้ตรงกับ enum AdPlatform
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
}

function normalizePlatform(value?: string): AllowedPlatform | null {
  const upper = typeof value === "string" ? value.toUpperCase().trim() : "";
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

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, message: "User has no organization" },
        { status: 403 }
      );
    }

    const body: TestPayload = await request.json();
    const platform = normalizePlatform(body.platform);

    if (!platform) {
      return NextResponse.json(
        { success: false, message: "platform ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // ตอนนี้ mock การเชื่อมต่อ: แค่เช็คว่ามี apiKey หรือ accessToken ก็ถือว่าสำเร็จ
    const hasKey = Boolean(body.apiKey?.trim() || body.accessToken?.trim());
    const success = hasKey;
    const message = success ? "เชื่อมต่อสำเร็จ" : "API Key หรือ Access Token ว่าง";

    // ถ้ามี id ให้บันทึกผลการทดสอบลง DB ด้วย
    if (body.id) {
      const existing = await prisma.adAccount.findFirst({
        where: {
          id: body.id,
          organizationId: user.organizationId,
        },
      });

      if (existing) {
        await prisma.adAccount.update({
          where: { id: existing.id },
          data: {
            lastTested: new Date(),
            isValid: success,
            testMessage: message,
          },
        });
      }
    }

    return NextResponse.json({
      success,
      message,
      status: success ? "SUCCESS" : "FAILED",
    });
  } catch (error) {
    console.error("Error testing ad account", error);
    return NextResponse.json(
      { success: false, message: "ไม่สามารถทดสอบการเชื่อมต่อได้" },
      { status: 500 }
    );
  }
}
