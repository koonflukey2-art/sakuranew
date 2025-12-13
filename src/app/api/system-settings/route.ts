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

    const safeSettings = {
      ...settings,
      lineNotifyToken: maskToken(settings.lineNotifyToken),
      lineChannelAccessToken: maskToken(settings.lineChannelAccessToken),
      lineChannelSecret: maskToken(settings.lineChannelSecret),
      adsLineNotifyToken: maskToken(settings.adsLineNotifyToken),
      adsLineChannelAccessToken: maskToken(settings.adsLineChannelAccessToken),
      adsLineChannelSecret: maskToken(settings.adsLineChannelSecret),
      dailySummaryLastSentAt: settings.dailySummaryLastSentAt,
    };

    return NextResponse.json(safeSettings);
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

    // ✅ --- NEW: reset daily summary sent flag ---
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

      const safeSettings = {
        ...settings,
        lineNotifyToken: maskToken(settings.lineNotifyToken),
        lineChannelAccessToken: maskToken(settings.lineChannelAccessToken),
        lineChannelSecret: maskToken(settings.lineChannelSecret),
        dailySummaryLastSentAt: settings.dailySummaryLastSentAt,
      };

      return NextResponse.json({
        ok: true,
        action: "resetDailySummary",
        settings: safeSettings,
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

    // update token เฉพาะตอนที่มีการกรอกค่าใหม่ (ไม่ใช่ค่าว่าง)
    if (typeof body.lineNotifyToken === "string" && body.lineNotifyToken.trim()) {
      updateData.lineNotifyToken = body.lineNotifyToken.trim();
    }
    if (
      typeof body.lineChannelAccessToken === "string" &&
      body.lineChannelAccessToken.trim()
    ) {
      updateData.lineChannelAccessToken = body.lineChannelAccessToken.trim();
    }
    if (typeof body.lineChannelSecret === "string" && body.lineChannelSecret.trim()) {
      updateData.lineChannelSecret = body.lineChannelSecret.trim();
    }

    // Optional: lineTargetId
    if (typeof body.lineTargetId === "string") {
      updateData.lineTargetId = body.lineTargetId.trim() || null;
    }

    // Ads LINE tokens (separate from stock LINE)
    if (typeof body.adsLineNotifyToken === "string" && body.adsLineNotifyToken.trim()) {
      updateData.adsLineNotifyToken = body.adsLineNotifyToken.trim();
    }
    if (
      typeof body.adsLineChannelAccessToken === "string" &&
      body.adsLineChannelAccessToken.trim()
    ) {
      updateData.adsLineChannelAccessToken = body.adsLineChannelAccessToken.trim();
    }
    if (typeof body.adsLineChannelSecret === "string" && body.adsLineChannelSecret.trim()) {
      updateData.adsLineChannelSecret = body.adsLineChannelSecret.trim();
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

    const safeSettings = {
      ...settings,
      lineNotifyToken: maskToken(settings.lineNotifyToken),
      lineChannelAccessToken: maskToken(settings.lineChannelAccessToken),
      lineChannelSecret: maskToken(settings.lineChannelSecret),
      adsLineNotifyToken: maskToken(settings.adsLineNotifyToken),
      adsLineChannelAccessToken: maskToken(settings.adsLineChannelAccessToken),
      adsLineChannelSecret: maskToken(settings.adsLineChannelSecret),
      dailySummaryLastSentAt: settings.dailySummaryLastSentAt,
    };

    return NextResponse.json(safeSettings);
  } catch (error: any) {
    console.error("POST system settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
