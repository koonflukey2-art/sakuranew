// app/api/daily-cutoff/auto/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDailySummaryForOrg } from "@/lib/dailyCutoff";

export const runtime = "nodejs";

function parseEnvInt(name: string, min: number, max: number): number | null {
  const raw = process.env[name];
  if (raw === undefined) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    console.warn(
      `Invalid ${name}="${raw}" (expected integer ${min}-${max}); falling back to SystemSettings.`
    );
    return null;
  }
  return value;
}

const BKK_OFFSET_HOURS = 7;
const MS_HOUR = 3600 * 1000;
const MS_MIN = 60 * 1000;

function toBangkok(date = new Date()) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcMs + BKK_OFFSET_HOURS * MS_HOUR);
}

function todayWindowBangkok() {
  const bkkNow = toBangkok(new Date());

  const startLocalBkk = new Date(bkkNow);
  startLocalBkk.setHours(0, 0, 0, 0);

  const endLocalBkk = new Date(bkkNow);
  endLocalBkk.setHours(23, 59, 59, 999);

  const startUtc = new Date(startLocalBkk.getTime() - BKK_OFFSET_HOURS * MS_HOUR);
  const endUtc = new Date(endLocalBkk.getTime() - BKK_OFFSET_HOURS * MS_HOUR);

  return { startUtc, endUtc };
}

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

  // 2) โหลด SystemSettings ทุกองค์กร
  const settingsList = await prisma.systemSettings.findMany({
    where: { organizationId: { not: null } },
    orderBy: { createdAt: "asc" },
  });

  if (settingsList.length === 0) {
    console.error("❌ No systemSettings with organizationId, skip auto cutoff");
    return NextResponse.json(
      { ok: true, skipped: true, reason: "no organizationId" },
      { status: 200 }
    );
  }

  const envHour = parseEnvInt("DAILY_CUTOFF_HOUR", 0, 23);
  const envMinute = parseEnvInt("DAILY_CUTOFF_MINUTE", 0, 59);

  const now = new Date();
  const { startUtc } = todayWindowBangkok();
  const results: Array<Record<string, any>> = [];

  for (const settings of settingsList) {
    const orgId = settings.organizationId;
    const hour = envHour ?? settings.dailyCutOffHour ?? 23;
    const minute = envMinute ?? settings.dailyCutOffMinute ?? 59;

    const cutoffUtc = new Date(
      startUtc.getTime() + hour * MS_HOUR + minute * MS_MIN
    );

    // ถ้ายังไม่ถึงเวลาตัดยอด → ข้าม
    if (now.getTime() < cutoffUtc.getTime()) {
      results.push({
        organizationId: orgId,
        skipped: true,
        reason: "before cutoff time",
        debug: {
          now: now.toISOString(),
          cutoff: cutoffUtc.toISOString(),
          configuredHourTH: hour,
          configuredMinuteTH: minute,
        },
      });
      continue;
    }

    try {
      const { summary, created } = await createDailySummaryForOrg(orgId, {
        date: startUtc,
        cutOffTime: cutoffUtc,
        sendLine: false,
      });

      results.push({
        organizationId: orgId,
        skipped: false,
        created,
        summaryId: summary.id,
        date: summary.date,
      });
    } catch (err) {
      console.error("❌ Failed to run auto cutoff:", err);
      results.push({
        organizationId: orgId,
        skipped: false,
        error: "failed to create summary",
      });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      processed: results.length,
      results,
    },
    { status: 200 }
  );
}

// รองรับทั้ง GET และ POST
export async function GET(req: NextRequest) {
  return handleAutoCutoff(req);
}

export async function POST(req: NextRequest) {
  return handleAutoCutoff(req);
}
