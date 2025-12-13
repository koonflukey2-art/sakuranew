// app/api/system-settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";

export const runtime = "nodejs";

// ใช้สำหรับ mask token ใน response (ไม่ให้ frontend เห็นเต็ม ๆ)
function maskToken(token: string | null | undefined): string | null {
  if (!token || token.length < 10) return null;
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

// กันไม่ให้ค่าที่ถูก mask (เช่น "abcd...wxyz") ไปถูก save ทับของจริงใน DB
function isMaskedValue(v: string): boolean {
  // รูปแบบที่ maskToken สร้าง: "xxxx...yyyy"
  return /^[A-Za-z0-9_-]{2,8}\.\.\.[A-Za-z0-9_-]{2,8}$/.test(v);
}

function toSafeSettings(settings: any) {
  return {
    ...settings,
    lineNotifyToken: maskToken(settings.lineNotifyToken),
    lineChannelAccessToken: maskToken(settings.lineChannelAccessToken),
    lineChannelSecret: maskToken(settings.lineChannelSecret),

    adsLineNotifyToken: maskToken(settings.adsLineNotifyToken),
    adsLineChannelAccessToken: maskToken(settings.adsLineChannelAccessToken),
    adsLineChannelSecret: maskToken(settings.adsLineChannelSecret),

    dailySummaryLastSentAt: settings.dailySummaryLastSentAt,
  };
}

export async function GET(_request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    let settings = await prisma.systemSettings.findUnique({
      where: { organizationId: orgId },
    });

    if (!settings) {
      // default
      settings = await prisma.systemSettings.create({
        data: {
          organizationId: orgId,
          dailyCutOffHour: 23,
          dailyCutOffMinute: 59,
          notifyOnOrder: true,
          notifyOnLowStock: true,
          notifyDailySummary: true,
          dailySummaryLastSentAt: null,
        },
      });
    }

    return NextResponse.json(toSafeSettings(settings));
  } catch (error: any) {
    console.error("GET system settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ตรวจ role แอดมิน
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { role: true },
    });

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only ADMIN can modify settings" },
        { status: 403 }
      );
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({} as any));

    // ✅ reset daily summary sent flag
    // รองรับ 2 แบบ:
    // 1) { action: "resetDailySummary" }
    // 2) { resetDailySummary: true }
    const wantsReset =
      body?.action === "resetDailySummary" || body?.resetDailySummary === true;

    if (wantsReset) {
      const settings = await prisma.systemSettings.upsert({
        where: { organizationId: orgId },
        update: {
          dailySummaryLastSentAt: null,
        },
        create: {
          organizationId: orgId,
          dailyCutOffHour: 23,
          dailyCutOffMinute: 59,
          notifyOnOrder: true,
          notifyOnLowStock: true,
          notifyDailySummary: true,
          dailySummaryLastSentAt: null,
        },
      });

      return NextResponse.json({
        ok: true,
        action: "resetDailySummary",
        settings: toSafeSettings(settings),
      });
    }

    // --- ปกติ: update settings ---
    const updateData: any = {};

    // Cut-off time
    if (body.dailyCutOffHour !== undefined) {
      updateData.dailyCutOffHour = parseInt(String(body.dailyCutOffHour), 10);
    }
    if (body.dailyCutOffMinute !== undefined) {
      updateData.dailyCutOffMinute = parseInt(String(body.dailyCutOffMinute), 10);
    }

    // LINE webhook URL
    if (body.lineWebhookUrl !== undefined) {
      updateData.lineWebhookUrl = body.lineWebhookUrl;
    }

    // update token เฉพาะตอนที่มีการกรอกค่าใหม่ (ไม่ใช่ค่าว่าง และไม่ใช่ค่า masked)
    if (typeof body.lineNotifyToken === "string") {
      const v = body.lineNotifyToken.trim();
      if (v && !isMaskedValue(v)) updateData.lineNotifyToken = v;
    }
    if (typeof body.lineChannelAccessToken === "string") {
      const v = body.lineChannelAccessToken.trim();
      if (v && !isMaskedValue(v)) updateData.lineChannelAccessToken = v;
    }
    if (typeof body.lineChannelSecret === "string") {
      const v = body.lineChannelSecret.trim();
      if (v && !isMaskedValue(v)) updateData.lineChannelSecret = v;
    }

    // Optional: lineTargetId
    if (typeof body.lineTargetId === "string") {
      updateData.lineTargetId = body.lineTargetId.trim() || null;
    }

    // Ads LINE tokens (separate from stock LINE) - กัน masked value ไม่ให้ไปทับของจริง
    if (typeof body.adsLineNotifyToken === "string") {
      const v = body.adsLineNotifyToken.trim();
      if (v && !isMaskedValue(v)) updateData.adsLineNotifyToken = v;
    }
    if (typeof body.adsLineChannelAccessToken === "string") {
      const v = body.adsLineChannelAccessToken.trim();
      if (v && !isMaskedValue(v)) updateData.adsLineChannelAccessToken = v;
    }
    if (typeof body.adsLineChannelSecret === "string") {
      const v = body.adsLineChannelSecret.trim();
      if (v && !isMaskedValue(v)) updateData.adsLineChannelSecret = v;
    }

    if (body.adsLineWebhookUrl !== undefined) {
      updateData.adsLineWebhookUrl = body.adsLineWebhookUrl;
    }

    // Notification flags
    if (body.notifyOnOrder !== undefined) {
      updateData.notifyOnOrder = !!body.notifyOnOrder;
    }
    if (body.notifyOnLowStock !== undefined) {
      updateData.notifyOnLowStock = !!body.notifyOnLowStock;
    }
    if (body.notifyDailySummary !== undefined) {
      updateData.notifyDailySummary = !!body.notifyDailySummary;
    }

    // Admin emails
    if (body.adminEmails !== undefined) {
      updateData.adminEmails = body.adminEmails;
    }

    const settings = await prisma.systemSettings.upsert({
      where: { organizationId: orgId },
      update: updateData,
      create: {
        organizationId: orgId,
        dailyCutOffHour: 23,
        dailyCutOffMinute: 59,
        notifyOnOrder: true,
        notifyOnLowStock: true,
        notifyDailySummary: true,
        dailySummaryLastSentAt: null,
        ...updateData,
      },
    });

    return NextResponse.json(toSafeSettings(settings));
  } catch (error: any) {
    console.error("POST system settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
