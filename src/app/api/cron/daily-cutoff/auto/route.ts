// app/api/daily-cutoff/auto/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDailySummaryForOrg } from "@/lib/dailyCutoff";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // 👉 ถ้าอยากล็อกเฉพาะ cron ให้ใช้ secret ตรวจเพิ่มก็ได้
    const secretFromEnv = process.env.CRON_SECRET;
    const secretFromHeader = req.headers.get("x-cron-secret");

    if (secretFromEnv && secretFromHeader !== secretFromEnv) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();

    // ดึง system settings ของทุก organization
    const allSettings = await prisma.systemSettings.findMany();

    for (const s of allSettings) {
      const { organizationId, dailyCutOffHour, dailyCutOffMinute } = s;

      // ถ้าไม่มี orgId ข้าม
      if (!organizationId) continue;

      const hour = dailyCutOffHour ?? 23;
      const minute = dailyCutOffMinute ?? 59;

      // เวลา cutoff ของ "วันนี้" ตามที่ตั้งค่าไว้
      const cutoffTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute,
        0,
        0
      );

      // ต่างกันกี่นาที (now - cutoffTime)
      const diffMinutes =
        (now.getTime() - cutoffTime.getTime()) / (1000 * 60);

      // ยิง cron ทุก ๆ 5 นาที → เราถือว่าถ้าอยู่ในช่วง 0–5 นาทีหลัง cutoff = ให้ตัดยอด
      if (diffMinutes >= 0 && diffMinutes <= 5) {
        // createDailySummaryForOrg มีเช็กซ้ำอยู่แล้ว ถ้ามีของวันนี้แล้วจะไม่สร้างอีก
        await createDailySummaryForOrg(organizationId, now);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("auto daily cutoff error:", err);
    return NextResponse.json(
      { error: err.message || "auto daily cutoff failed" },
      { status: 500 }
    );
  }
}
