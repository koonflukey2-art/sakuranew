// src/app/api/system-settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";

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

  isActive?: boolean; // ถ้ามีใน schema ค่อยใช้ (ถ้าไม่มีจะ ignore)
};

function pickString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function GET() {
  try {
    const u = await currentUser();
    if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 403 });

    const settings = await prisma.systemSettings.findUnique({
      where: { organizationId: orgId },
      select: {
        organizationId: true,

        adsLineChannelAccessToken: true,
        adsLineChannelSecret: true,
        adsLineWebhookUrl: true,
        adsLineNotifyToken: true,
        lineTargetId: true,

        // ถ้ามีฟิลด์อื่น ๆ ใน SystemSettings แล้วอยากให้ UI เห็น ก็เติม select ได้
      },
    });

    // ถ้ายังไม่มี row ให้คืนค่า default ไปก่อน (กันหน้า UI พัง)
    if (!settings) {
      return NextResponse.json({
        organizationId: orgId,
        adsLineChannelAccessToken: null,
        adsLineChannelSecret: null,
        adsLineWebhookUrl: null,
        adsLineNotifyToken: null,
        lineTargetId: null,
      });
    }

    return NextResponse.json(settings);
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
    const u = await currentUser();
    if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const lineTargetId = pickString(body.lineTargetId);

    const data: any = {
      adsLineChannelAccessToken: accessToken,
      adsLineChannelSecret: secret,
      adsLineWebhookUrl: webhookUrl,
      adsLineNotifyToken: notifyToken,
      ...(lineTargetId ? { lineTargetId } : {}),
    };

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
