// app/api/daily-cutoff/auto/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDailySummaryForOrg } from "@/lib/dailyCutoff";

export const runtime = "nodejs";

// ใช้ร่วมกันทั้ง GET / POST
async function handleAutoCutoff(req: NextRequest) {
  // 1) ตรวจสอบ CRON_SECRET จาก header
  const headerSecret = req.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("❌ CRON_SECRET is not set in environment!");
    return new NextResponse("CRON_SECRET not configured", { status: 500 });
  }

  if (!headerSecret || headerSecret !== expectedSecret) {
    console.warn("❌ Invalid cron secret");
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 2) หา organization จาก SystemSettings แถวแรก
  const settings = await prisma.systemSettings.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!settings?.organizationId) {
    console.error("❌ No systemSettings with organizationId, skip auto cutoff");
    return NextResponse.json(
      { ok: false, skipped: true, reason: "no organizationId" },
      { status: 200 }
    );
  }

  const orgId = settings.organizationId;

  // 3) เอาเวลาตัดยอดจาก settings (ตีความเป็น "เวลาไทย")
  const hour = settings.dailyCutOffHour ?? 23;
  const minute = settings.dailyCutOffMinute ?? 59;

  const now = new Date();

  // 🇹🇭 แปลง "เวลาไทย (UTC+7)" → UTC ก่อนเอาไป set ใน Date
  const TH_OFFSET = 7;
  const cutoff = new Date(now);

  // hour ที่เก็บใน DB = ชั่วโมงตามเวลาไทย
  // แปลงเป็นชั่วโมง UTC (ลบ 7 ชั่วโมง แล้ว modulo 24 กันติดลบ)
  const cutoffUtcHour = (hour - TH_OFFSET + 24) % 24;
  cutoff.setUTCHours(cutoffUtcHour, minute, 0, 0);

  // ถ้ายังไม่ถึงเวลาตัดยอด → ข้าม
  if (now.getTime() < cutoff.getTime()) {
    console.log("⏭️ Skip auto cutoff: before cutoff time", {
      now: now.toISOString(),
      cutoff: cutoff.toISOString(),
      configuredHourTH: hour,
      configuredMinuteTH: minute,
    });

    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: "before cutoff time",
        now: now.toISOString(),
        cutoff: cutoff.toISOString(),
      },
      { status: 200 }
    );
  }

  // 4) ถึงเวลาแล้ว → สร้าง summary (ฟังก์ชันนี้กันซ้ำให้แล้ว)
  try {
    const { summary, created } = await createDailySummaryForOrg(orgId);

    console.log("✅ Auto daily cutoff done", {
      orgId,
      summaryId: summary.id,
      created,
      date: summary.date,
    });

    return NextResponse.json(
      {
        ok: true,
        skipped: false,
        created,
        summaryId: summary.id,
        date: summary.date,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Failed to run auto cutoff:", err);
    return NextResponse.json(
      { ok: false, skipped: false, error: "failed to create summary" },
      { status: 500 }
    );
  }
}

// รองรับทั้ง GET และ POST
export async function GET(req: NextRequest) {
  return handleAutoCutoff(req);
}

export async function POST(req: NextRequest) {
  return handleAutoCutoff(req);
}
