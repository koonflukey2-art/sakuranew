// app/api/daily-cutoff/auto/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDailySummaryForOrg } from "@/lib/dailyCutoff";

export const runtime = "nodejs";

// หา organizationId จาก systemSettings แถวแรก (แบบเดียวกับ webhook LINE)
async function getActiveOrganizationFromSystemSettings() {
  const settings = await prisma.systemSettings.findFirst();

  if (!settings || !settings.organizationId) {
    console.error(
      "❌ No systemSettings or organizationId is null – please open System Settings page and click save once."
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

  // 2) หา orgId จาก systemSettings (ไม่ต้องใช้ Clerk/currentUser)
  const orgId = await getActiveOrganizationFromSystemSettings();
  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: "No active organizationId in systemSettings" },
      { status: 500 }
    );
  }

  // 3) อ่านเวลาตัดยอดจาก systemSettings
  const settings = await prisma.systemSettings.findUnique({
    where: { organizationId: orgId },
  });

  const hour = settings?.dailyCutOffHour ?? 23;
  const minute = settings?.dailyCutOffMinute ?? 59;

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(hour, minute, 0, 0);

  // 4) ถ้ายังไม่ถึงเวลาตัดยอด → ข้าม
  if (now.getTime() < cutoff.getTime()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "before cutoff time",
      now: now.toISOString(),
      cutoff: cutoff.toISOString(),
    });
  }

  // 5) ถึงเวลาแล้ว → สร้าง summary (ฟังก์ชันกันซ้ำอยู่แล้ว)
  const { summary, created } = await createDailySummaryForOrg(orgId);

  return NextResponse.json({
    ok: true,
    skipped: false,
    created,
    summaryId: summary.id,
  });
}

// รองรับทั้ง GET และ POST
export async function GET(req: NextRequest) {
  return handleAutoCutoff(req);
}

export async function POST(req: NextRequest) {
  return handleAutoCutoff(req);
}
