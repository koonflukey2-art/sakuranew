// src/app/api/system-settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";
import { requireRole } from "@/lib/auth-guard";

export const runtime = "nodejs";

type Payload = {
  // Ads LINE (ใช้กับ /api/webhooks/line-ads)
  adsLineChannelAccessToken?: string | null;
  adsLineChannelSecret?: string | null;
  adsLineWebhookUrl?: string | null;
  adsLineNotifyToken?: string | null;

  // (optional) เก็บ targetId ที่จะใช้ push ถ้าไม่มี replyToken
  lineTargetId?: string | null;

  // เผื่อ UI ส่งชื่อ generic มา (compat)
  channelAccessToken?: string | null;
  channelSecret?: string | null;
  webhookUrl?: string | null;

  lineNotifyToken?: string | null;
  lineChannelAccessToken?: string | null;
  lineChannelSecret?: string | null;
  lineWebhookUrl?: string | null;

  dailyCutOffHour?: number | null;
  dailyCutOffMinute?: number | null;

  notifyOnOrder?: boolean;
  notifyOnLowStock?: boolean;
  notifyDailySummary?: boolean;

  adminEmails?: string | null;
};

function pickString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function pickNullableString(v: unknown): string | null | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : null;
}

function maskSecret(value: string | null) {
  if (!value) return null;
  if (value.length <= 6) return "******";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

function validateHour(value: number | null | undefined) {
  if (value === null || value === undefined) return true;
  return Number.isInteger(value) && value >= 0 && value <= 23;
}

function validateMinute(value: number | null | undefined) {
  if (value === null || value === undefined) return true;
  return Number.isInteger(value) && value >= 0 && value <= 59;
}

export async function GET() {
  try {
    const { response } = await requireRole("ADMIN");
    if (response) {
      return response;
    }

    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 403 });

    const settings = await prisma.systemSettings.findUnique({
      where: { organizationId: orgId },
      select: {
        organizationId: true,

        dailyCutOffHour: true,
        dailyCutOffMinute: true,

        lineNotifyToken: true,
        lineChannelAccessToken: true,
        lineChannelSecret: true,
        lineWebhookUrl: true,
        lineTargetId: true,

        adsLineNotifyToken: true,
        adsLineChannelAccessToken: true,
        adsLineChannelSecret: true,
        adsLineWebhookUrl: true,

        adminEmails: true,

        notifyOnOrder: true,
        notifyOnLowStock: true,
        notifyDailySummary: true,

        dailySummaryLastSentAt: true,
        lastCutOffTime: true,
        currentDailySequence: true,

        // ถ้ามีฟิลด์อื่น ๆ ใน SystemSettings แล้วอยากให้ UI เห็น ก็เติม select ได้
      },
    });

    // ถ้ายังไม่มี row ให้คืนค่า default ไปก่อน (กันหน้า UI พัง)
    if (!settings) {
      return NextResponse.json({
        organizationId: orgId,
        dailyCutOffHour: 23,
        dailyCutOffMinute: 59,

        lineNotifyToken: null,
        lineChannelAccessToken: null,
        lineChannelSecret: null,
        lineWebhookUrl: null,
        lineTargetId: null,

        adsLineNotifyToken: null,
        adsLineChannelAccessToken: null,
        adsLineChannelSecret: null,
        adsLineWebhookUrl: null,

        adminEmails: null,

        notifyOnOrder: true,
        notifyOnLowStock: true,
        notifyDailySummary: true,

        dailySummaryLastSentAt: null,
        lastCutOffTime: null,
        currentDailySequence: 0,
      });
    }

    return NextResponse.json({
      ...settings,
      lineNotifyToken: maskSecret(settings.lineNotifyToken),
      lineChannelAccessToken: maskSecret(settings.lineChannelAccessToken),
      lineChannelSecret: maskSecret(settings.lineChannelSecret),
      lineWebhookUrl: settings.lineWebhookUrl,
      lineTargetId: settings.lineTargetId,
      adsLineNotifyToken: maskSecret(settings.adsLineNotifyToken),
      adsLineChannelAccessToken: maskSecret(settings.adsLineChannelAccessToken),
      adsLineChannelSecret: maskSecret(settings.adsLineChannelSecret),
      adsLineWebhookUrl: settings.adsLineWebhookUrl,
    });
  } catch (e: any) {
    console.error("Error fetching SystemSettings:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireRole("ADMIN");
    if (response) {
      return response;
    }

    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 403 });

    const body = (await request.json()) as Payload;

    // ✅ รองรับทั้งชื่อฟิลด์แบบ adsLine... และ generic จาก UI เดิม
    const accessToken =
      pickString(body.adsLineChannelAccessToken) ?? pickString(body.channelAccessToken);
    const secret =
      pickString(body.adsLineChannelSecret) ?? pickString(body.channelSecret);
    const webhookUrl =
      pickString(body.adsLineWebhookUrl) ?? pickString(body.webhookUrl);
    const notifyToken = pickString(body.adsLineNotifyToken);
    const lineTargetId = pickNullableString(body.lineTargetId);

    const lineNotifyToken = pickString(body.lineNotifyToken);
    const lineChannelAccessToken = pickString(body.lineChannelAccessToken);
    const lineChannelSecret = pickString(body.lineChannelSecret);
    const lineWebhookUrl = pickString(body.lineWebhookUrl);

    const adminEmails = pickNullableString(body.adminEmails);

    const dailyCutOffHour =
      typeof body.dailyCutOffHour === "number"
        ? body.dailyCutOffHour
        : body.dailyCutOffHour === null
        ? null
        : undefined;
    const dailyCutOffMinute =
      typeof body.dailyCutOffMinute === "number"
        ? body.dailyCutOffMinute
        : body.dailyCutOffMinute === null
        ? null
        : undefined;

    if (!validateHour(dailyCutOffHour)) {
      return NextResponse.json(
        { error: "dailyCutOffHour ต้องเป็นตัวเลข 0-23" },
        { status: 400 }
      );
    }

    if (!validateMinute(dailyCutOffMinute)) {
      return NextResponse.json(
        { error: "dailyCutOffMinute ต้องเป็นตัวเลข 0-59" },
        { status: 400 }
      );
    }

    const data: Record<string, any> = {};

    if (accessToken) data.adsLineChannelAccessToken = accessToken;
    if (secret) data.adsLineChannelSecret = secret;
    if (webhookUrl) data.adsLineWebhookUrl = webhookUrl;
    if (notifyToken) data.adsLineNotifyToken = notifyToken;

    if (lineNotifyToken) data.lineNotifyToken = lineNotifyToken;
    if (lineChannelAccessToken) data.lineChannelAccessToken = lineChannelAccessToken;
    if (lineChannelSecret) data.lineChannelSecret = lineChannelSecret;
    if (lineWebhookUrl) data.lineWebhookUrl = lineWebhookUrl;

    if ("lineTargetId" in body) {
      data.lineTargetId = lineTargetId;
    }

    if ("adminEmails" in body) {
      data.adminEmails = adminEmails;
    }

    if ("dailyCutOffHour" in body) {
      data.dailyCutOffHour = dailyCutOffHour ?? undefined;
    }
    if ("dailyCutOffMinute" in body) {
      data.dailyCutOffMinute = dailyCutOffMinute ?? undefined;
    }

    if ("notifyOnOrder" in body) data.notifyOnOrder = Boolean(body.notifyOnOrder);
    if ("notifyOnLowStock" in body)
      data.notifyOnLowStock = Boolean(body.notifyOnLowStock);
    if ("notifyDailySummary" in body)
      data.notifyDailySummary = Boolean(body.notifyDailySummary);

    const saved = await prisma.systemSettings.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        ...data,
      },
      update: data,
    });

    return NextResponse.json(saved);
  } catch (e: any) {
    console.error("Error saving SystemSettings:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
