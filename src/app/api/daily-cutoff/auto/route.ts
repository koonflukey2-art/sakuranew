// app/api/daily-cutoff/auto/route.ts
import { NextRequest, NextResponse } from "next/server";
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

  // 2) ดึง systemSettings ทั้งหมด (ส่วนใหญ่คุณจะมีแค่ 1 แถว)
  const settingsList = await prisma.systemSettings.findMany();

  if (!settingsList.length) {
    console.warn("No systemSettings rows found – ยังไม่เคยบันทึกหน้า System Settings");
    return NextResponse.json(
      { ok: true, skipped: true, reason: "no system settings" },
      { status: 200 }
    );
  }

  const now = new Date();
  const results: any[] = [];

  for (const settings of settingsList) {
    if (!settings.organizationId) {
      console.warn("systemSettings row has no organizationId, skip");
      results.push({
        organizationId: null,
        skipped: true,
        reason: "no organizationId in systemSettings",
      });
      continue;
    }

    const hour = settings.dailyCutOffHour ?? 23;
    const minute = settings.dailyCutOffMinute ?? 59;

    const cutoff = new Date(now);
    cutoff.setHours(hour, minute, 0, 0);

    // ถ้ายังไม่ถึงเวลาตัดยอด → ข้าม org นี้ไป
    if (now.getTime() < cutoff.getTime()) {
      results.push({
        organizationId: settings.organizationId,
        skipped: true,
        reason: "before cutoff time",
        now: now.toISOString(),
        cutoff: cutoff.toISOString(),
      });
      continue;
    }

    // ถึงเวลาแล้ว → สร้าง summary (ฟังก์ชันกันซ้ำให้แล้ว)
    const { summary, created } = await createDailySummaryForOrg(
      settings.organizationId
    );

    results.push({
      organizationId: settings.organizationId,
      skipped: false,
      created,
      summaryId: summary.id,
    });
  }

  return NextResponse.json({ ok: true, results }, { status: 200 });
}

// รองรับทั้ง GET และ POST เพื่อกันพลาดจาก cron-job
export async function GET(req: NextRequest) {
  return handleAutoCutoff(req);
}

export async function POST(req: NextRequest) {
  return handleAutoCutoff(req);
}
