// src/app/api/cron/daily-summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineNotify, pushLineMessage } from "@/lib/line-integration";
import { calculateOrderProfit } from "@/lib/profit-calculator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ===== Time helpers (Asia/Bangkok) ===== */
function toBkk(date = new Date()) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcMs + 7 * 60 * 60000);
}

function toThaiDateLabel(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** คืนช่วงเวลาของ "วันนี้ (BKK)" แต่เป็น UTC สำหรับ query DB (endExclusive) */
function todayWindowBangkokUtc(now = new Date()) {
  const bkkNow = toBkk(now);

  const startBkk = new Date(bkkNow);
  startBkk.setHours(0, 0, 0, 0);

  const endBkkExclusive = new Date(startBkk);
  endBkkExclusive.setDate(startBkk.getDate() + 1); // พรุ่งนี้ 00:00 (BKK)

  const startUtc = new Date(startBkk.getTime() - 7 * 60 * 60000);
  const endUtcExclusive = new Date(endBkkExclusive.getTime() - 7 * 60 * 60000);

  return { startUtc, endUtcExclusive, dateLabel: toThaiDateLabel(bkkNow), bkkNow };
}

/** กันส่งซ้ำ: ดูว่าเป็นวันเดียวกันใน BKK ไหม */
function isSameBkkDay(a: Date, b: Date) {
  const aa = toBkk(a);
  const bb = toBkk(b);
  return (
    aa.getFullYear() === bb.getFullYear() &&
    aa.getMonth() === bb.getMonth() &&
    aa.getDate() === bb.getDate()
  );
}

/** เช็คว่าเวลาปัจจุบันอยู่ในช่วง cut-off window (BKK) */
function isWithinCutoffWindowBkk(
  now: Date,
  cutHour: number,
  cutMinute: number,
  windowMinutes = 2
) {
  const bkk = toBkk(now);
  const nowMin = bkk.getHours() * 60 + bkk.getMinutes();
  const cutMin = cutHour * 60 + cutMinute;
  return nowMin >= cutMin && nowMin < cutMin + windowMinutes;
}

const fmtTHB = (n: number) => n.toLocaleString("th-TH");

type SummaryParams = {
  dateLabel: string;
  orderCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  margin: number;
  breakdownLines: string[];
};

function formatMessage(p: SummaryParams) {
  const breakdown =
    p.breakdownLines.length > 0
      ? `\n\n🧾 รายการสินค้า:\n${p.breakdownLines.join("\n")}`
      : "";

  return (
    `📊 สรุปยอดประจำวัน ${p.dateLabel}\n\n` +
    `📦 ออเดอร์: ${p.orderCount} รายการ\n` +
    `💰 รายได้: ฿${fmtTHB(p.totalRevenue)}\n` +
    `💵 ต้นทุน: ฿${fmtTHB(p.totalCost)}\n` +
    `✨ กำไรสุทธิ: ฿${fmtTHB(p.totalProfit)}\n` +
    `📈 Margin: ${p.margin.toFixed(2)}%` +
    breakdown
  );
}

function buildBreakdownLines(
  orders: Array<{
    productType: number | null;
    productName: string | null;
    quantity: number;
  }>
): string[] {
  const map = new Map<string, number>();

  for (const o of orders) {
    const name =
      (o.productName && o.productName.trim()) ||
      (o.productType != null ? `ประเภท ${o.productType}` : "ไม่ระบุสินค้า");

    map.set(name, (map.get(name) ?? 0) + (o.quantity || 0));
  }

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, qty]) => `• ${name}: ${fmtTHB(qty)} ชิ้น`);
}

export async function GET(req: Request) {
  try {
    /** --- Auth: รองรับทั้ง Authorization: Bearer <secret> และ X-Cron-Secret --- */
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization");
    const xcron = req.headers.get("x-cron-secret");

    // อนุญาตตอน dev ถ้าไม่ได้ตั้ง secret (กัน dev ยิงทดสอบลำบาก)
    const authorized =
      (process.env.NODE_ENV !== "production" && !secret) ||
      (!!secret &&
        ((auth && auth === `Bearer ${secret}`) || (xcron && xcron === secret)));

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const { startUtc, endUtcExclusive, dateLabel } = todayWindowBangkokUtc(now);

    /** --- ดึง org ที่เปิดส่งสรุป + มีช่องทางส่ง --- */
    const settings = await prisma.systemSettings.findMany({
      where: {
        notifyDailySummary: true,
        OR: [
          {
            lineChannelAccessToken: { notIn: [null, ""] },
            lineTargetId: { notIn: [null, ""] },
          },
          { lineNotifyToken: { notIn: [null, ""] } },
        ],
      },
      select: {
        organizationId: true,
        lineChannelAccessToken: true,
        lineTargetId: true,
        lineNotifyToken: true,

        // ✅ ใช้ตามหน้าตั้งค่า
        dailyCutOffHour: true,
        dailyCutOffMinute: true,

        // ✅ กันส่งซ้ำ
        dailySummaryLastSentAt: true,
      },
    });

    const results: Array<Record<string, any>> = [];

    for (const s of settings) {
      try {
        const cutHour = s.dailyCutOffHour ?? 23;
        const cutMinute = s.dailyCutOffMinute ?? 59;

        // ✅ 1) ถ้ายังไม่ถึงเวลาตัดยอดตาม settings => ข้าม
        if (!isWithinCutoffWindowBkk(now, cutHour, cutMinute, 2)) {
          results.push({
            organizationId: s.organizationId,
            skipped: true,
            reason: `not in cutoff window (${String(cutHour).padStart(2, "0")}:${String(
              cutMinute
            ).padStart(2, "0")})`,
          });
          continue;
        }

        // ✅ 2) ถ้าส่งไปแล้ววันนี้ => ข้าม
        if (s.dailySummaryLastSentAt && isSameBkkDay(s.dailySummaryLastSentAt, now)) {
          results.push({
            organizationId: s.organizationId,
            skipped: true,
            reason: "already sent today",
          });
          continue;
        }

        // --- ออเดอร์วันนี้ของ org นี้ ---
        const orders = await prisma.order.findMany({
          where: {
            organizationId: s.organizationId,
            orderDate: { gte: startUtc, lt: endUtcExclusive },
          },
          select: {
            productType: true,
            productName: true,
            quantity: true,
            amount: true,
          },
        });

        const breakdownLines = buildBreakdownLines(orders);

        // --- รวมยอดแบบคิดโปรโมชันต่อออเดอร์ ---
        let totalRevenue = 0;
        let totalCost = 0;

        for (const o of orders) {
          totalRevenue += o.amount;

          const calc = await calculateOrderProfit(
            {
              productType: o.productType ?? null, // ✅ สำคัญ: ห้ามใช้ 0
              quantity: o.quantity,
              amount: o.amount,
            },
            s.organizationId
          );

          totalCost += calc.cost;
        }

        const orderCount = orders.length;
        const totalProfit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        const message = formatMessage({
          dateLabel,
          orderCount,
          totalRevenue,
          totalCost,
          totalProfit,
          margin,
          breakdownLines,
        });

        // --- ส่ง LINE: push ก่อน ถ้าไม่ได้ค่อย fallback notify ---
        let sent = false;
        let via: "push" | "notify" | "none" = "none";

        if (s.lineChannelAccessToken && s.lineTargetId) {
          sent = await pushLineMessage(s.lineTargetId, s.lineChannelAccessToken, message);
          via = "push";
        }

        if (!sent && s.lineNotifyToken) {
          sent = await sendLineNotify(s.lineNotifyToken, message);
          if (sent) via = "notify";
        }

        // ✅ 3) อัปเดต last sent เฉพาะตอนส่งสำเร็จ
        if (sent) {
          await prisma.systemSettings.update({
            where: { organizationId: s.organizationId },
            data: { dailySummaryLastSentAt: now },
          });
        }

        results.push({
          organizationId: s.organizationId,
          orderCount,
          totalRevenue,
          totalCost,
          totalProfit,
          margin,
          breakdownCount: breakdownLines.length,
          cutoff: `${String(cutHour).padStart(2, "0")}:${String(cutMinute).padStart(
            2,
            "0"
          )}`,
          via,
          sent,
        });
      } catch (err: any) {
        results.push({
          organizationId: s.organizationId,
          error: err?.message ?? String(err),
        });
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (error: any) {
    console.error("GET /api/cron/daily-summary error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run daily summary" },
      { status: 500 }
    );
  }
}
