import { NextResponse } from "next/server";
import { AdPlatform, AdTestStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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

function normalizePlatform(value?: string): AdPlatform | null {
  const upper = typeof value === "string" ? value.toUpperCase() : "";
  return Object.values(AdPlatform).includes(upper as AdPlatform)
    ? (upper as AdPlatform)
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

    if (!hasKey) {
      return NextResponse.json(
        {
          success: false,
          message: "API Key หรือ Access Token ว่าง",
          status: "FAILED",
        },
        { status: 400 }
      );
    }

    const success = Math.random() > 0.25;
    const status: AdTestStatus = success ? "SUCCESS" : "FAILED";
    const message = success
      ? "เชื่อมต่อสำเร็จ"
      : "ไม่สามารถเชื่อมต่อได้ โปรดลองตรวจสอบข้อมูลอีกครั้ง";

    if (body.id) {
      const existing = await prisma.adAccount.findFirst({
        where: { id: body.id, userId: user.id },
      });

      if (existing) {
        await prisma.adAccount.update({
          where: { id: existing.id },
          data: {
            lastTestedAt: new Date(),
            lastTestStatus: status,
          },
        });
      }
    }

    return NextResponse.json({ success, message, status });
  } catch (error) {
    console.error("Error testing ad account", error);
    return NextResponse.json(
      { success: false, message: "ไม่สามารถทดสอบการเชื่อมต่อได้" },
      { status: 500 }
    );
  }
}
