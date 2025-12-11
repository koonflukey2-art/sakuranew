// app/api/daily-cutoff/auto/route.ts
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { createDailySummaryForOrg } from "@/lib/dailyCutoff";

export const runtime = "nodejs";

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

  // 2) หา org + settings
  const user = await currentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const orgId = await getOrganizationId();
  if (!orgId) {
    return new NextResponse("No organization", { status: 400 });
  }

  const settings = await prisma.systemSettings.findUnique({
    where: { organizationId: orgId },
  });

  const hour = settings?.dailyCutOffHour ?? 23;
  const minute = settings?.dailyCutOffMinute ?? 59;

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(hour, minute, 0, 0);

  // 3) ถ้ายังไม่ถึงเวลาตัดยอด → ข้ามไป
  if (now.getTime() < cutoff.getTime()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "before cutoff time",
      now: now.toISOString(),
      cutoff: cutoff.toISOString(),
    });
  }

  // 4) ถึงเวลาแล้ว → สร้าง summary (กันซ้ำในฟังก์ชันอยู่แล้ว)
  const { summary, created } = await createDailySummaryForOrg(orgId);

  return NextResponse.json({
    ok: true,
    skipped: false,
    created,
    summaryId: summary.id,
  });
}

// รองรับทั้ง GET และ POST เพื่อกันพลาดจาก cron-job
export async function GET(req: NextRequest) {
  return handleAutoCutoff(req);
}

export async function POST(req: NextRequest) {
  return handleAutoCutoff(req);
}
