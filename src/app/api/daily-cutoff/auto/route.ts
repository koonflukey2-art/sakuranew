// src/app/api/daily-cutoff/auto/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDailySummaryForOrg } from "@/lib/dailyCutoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ใช้ SystemSettings แถวแรก เพื่อหา organizationId (เหมือน webhook LINE)
async function getActiveOrganizationFromSystemSettings() {
  const settings = await prisma.systemSettings.findFirst();

  if (!settings || !settings.organizationId) {
    console.error(
      "❌ No organizationId in systemSettings – กรุณาตั้งค่าในหน้า System Settings"
    );
    return null;
  }

  return settings.organizationId;
}

async function handleAutoCutoff(req: NextRequest) {
  // 1) เช็ค CRON_SECRET จาก header
  const headerSecret = req.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("CRON_SECRET is not set in environment!");
    return new NextResponse("CRON_SECRET not configured", { status: 500 });
  }

  if (!headerSecret || headerSecret !== expectedSecret) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 2) หา organizationId จาก SystemSettings
  const orgId = await getActiveOrganizationFromSystemSettings();
  if (!orgId) {
    return new NextResponse("No organization", { status: 500 });
  }

  // 3) เรียกฟังก์ชันสรุปยอด (กันซ้ำในฟังก์ชันแล้ว)
  const { summary, created } = await createDailySummaryForOrg(orgId);

  return NextResponse.json({
    ok: true,
    created,
    summaryId: summary.id,
  });
}

export async function GET(req: NextRequest) {
  return handleAutoCutoff(req);
}

// เผื่อ cron อยากใช้ POST ก็รองรับไว้ด้วย
export async function POST(req: NextRequest) {
  return handleAutoCutoff(req);
}
