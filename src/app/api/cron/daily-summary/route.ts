// src/app/api/cron/daily-summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineNotify, pushLineMessage } from "@/lib/line-integration";
import { calculateOrderProfit } from "@/lib/profit-calculator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BKK_OFFSET_HOURS = 7;
const MS_HOUR = 3600 * 1000;

function toBangkok(date = new Date()) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcMs + BKK_OFFSET_HOURS * MS_HOUR);
}

function toThaiDateLabel(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const fmtTHB = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("th-TH");

/** คืน start/end ของ "วันนี้" ตาม Bangkok แต่เป็น UTC สำหรับ query DB */
function todayWindowBangkok() {
  const bkkNow = toBangkok(new Date());

  const startLocalBkk = new Date(bkkNow);
  startLocalBkk.setHours(0, 0, 0, 0);

  const endLocalBkk = new Date(bkkNow);
  endLocalBkk.setHours(23, 59, 59, 999);

  const startUtc = new Date(startLocalBkk.getTime() - BKK_OFFSET_HOURS * MS_HOUR);
  const endUtc = new Date(endLocalBkk.getTime() - BKK_OFFSET_HOURS * MS_HOUR);

  return {
    bkkNow,
    startLocalBkk,
    startUtc,
    endUtc,
    dateLabel: toThaiDateLabel(bkkNow),
  };
}

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
  orders: Array<{ productType: number | null; productName: string | null; quantity: number }>
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

/** เช็คว่าควรส่งตอนนี้ไหม: หลัง cut-off และยังไม่เคยส่งวันนี้ (อิงเวลา BKK) */
function shouldSendNow(args: {
  bkkNow: Date;
  startLocalBkk: Date;
  cutOffHour: number;
  cutOffMinute: number;
  lastSentAt: Date | null;
}) {
  const { bkkNow, startLocalBkk, cutOffHour, cutOffMinute, lastSentAt } = args;

  const cutoffTodayBkk = new Date(startLocalBkk);
  cutoffTodayBkk.setHours(cutOffHour ?? 23, cutOffMinute ?? 59, 0, 0);

  // ยังไม่ถึงเวลา cut-off -> ไม่ส่ง
  if (bkkNow.getTime() < cutoffTodayBkk.getTime()) return false;

  // ถ้าเคยส่งแล้ว “วันนี้” (ตามเวลา BKK) -> ไม่ส่งซ้ำ
  if (lastSentAt) {
    const lastSentBkk = toBangkok(lastSentAt);
    if (lastSentBkk.getTime() >= startLocalBkk.getTime()) return false;
  }

  return true;
}

export async function GET(req: Request) {
  try {
    // --- Auth: แนะนำให้ใช้ X-Cron-Secret (กัน Clerk เข้าใจผิดว่าเป็น JWT) ---
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
    }

    const auth = req.headers.get("authorization");
    const xcron = req.headers.get("x-cron-secret");

    const authorized =
      (xcron && xcron === secret) || (auth && auth === `Bearer ${secret}`);

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Prisma: ห้ามใช้ notIn: [null,""] -> แยกเป็น not null และ not ""
    const settings = await prisma.systemSettings.findMany({
      where: {
        notifyDailySummary: true,
        OR: [
          {
            AND: [
              { lineChannelAccessToken: { not: null } },
              { lineChannelAccessToken: { not: "" } },
              { lineTargetId: { not: null } },
              { lineTargetId: { not: "" } },
            ],
          },
          {
            AND: [{ lineNotifyToken: { not: null } }, { lineNotifyToken: { not: "" } }],
          },
        ],
      },
      select: {
        organizationId: true,
        lineChannelAccessToken: true,
        lineTargetId: true,
        lineNotifyToken: true,
        dailyCutOffHour: true,
        dailyCutOffMinute: true,
        dailySummaryLastSentAt: true,
      },
    });

    const { bkkNow, startLocalBkk, startUtc, endUtc, dateLabel } = todayWindowBangkok();
    const results: Array<Record<string, any>> = [];

    for (const s of settings) {
      const prevLastSent = s.dailySummaryLastSentAt ?? null;

      try {
        const cutOffHour = s.dailyCutOffHour ?? 23;
        const cutOffMinute = s.dailyCutOffMinute ?? 59;

        // ✅ ยิง cron ถี่ได้ แต่จะส่งจริงเฉพาะ “หลังเวลาที่ตั้ง” และ “วันละครั้ง”
        const okToSend = shouldSendNow({
          bkkNow,
          startLocalBkk,
          cutOffHour,
          cutOffMinute,
          lastSentAt: prevLastSent,
        });

        if (!okToSend) {
          results.push({
            organizationId: s.organizationId,
            skipped: true,
            reason: "not_time_or_already_sent",
          });
          continue;
        }

        // ✅ กันส่งซ้ำ (atomic lock)
        // พยายามอัปเดต lastSentAt เฉพาะกรณีที่ “ยังไม่เคยส่งวันนี้”
        const lock = await prisma.systemSettings.updateMany({
          where: {
            organizationId: s.organizationId,
            OR: [{ dailySummaryLastSentAt: null }, { dailySummaryLastSentAt: { lt: startUtc } }],
          },
          data: { dailySummaryLastSentAt: new Date() },
        });

        if (lock.count === 0) {
          results.push({
            organizationId: s.organizationId,
            skipped: true,
            reason: "already_locked_or_sent",
          });
          continue;
        }

        // --- ออเดอร์วันนี้ของ org นี้ ---
        const orders = await prisma.order.findMany({
          where: {
            organizationId: s.organizationId,
            orderDate: { gte: startUtc, lte: endUtc },
          },
          select: {
            productType: true,
            productName: true,
            quantity: true,
            amount: true,
          },
        });

        const breakdownLines = buildBreakdownLines(orders);

        let totalRevenue = 0;
        let totalCost = 0;

        for (const o of orders) {
          totalRevenue += o.amount;

          const calc = await calculateOrderProfit(
            {
              productType: o.productType ?? null,
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

        // ถ้าส่งไม่สำเร็จ -> rollback lock เพื่อให้ cron รอบถัดไปลองใหม่ได้
        if (!sent) {
          await prisma.systemSettings.update({
            where: { organizationId: s.organizationId },
            data: { dailySummaryLastSentAt: prevLastSent },
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
          via,
          sent,
        });
      } catch (err: any) {
        // ถ้า error ระหว่างทาง -> rollback lock ด้วย
        try {
          await prisma.systemSettings.update({
            where: { organizationId: s.organizationId },
            data: { dailySummaryLastSentAt: prevLastSent },
          });
        } catch {}

        results.push({
          organizationId: s.organizationId,
          error: err?.message ?? String(err),
        });
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (error: any) {
    console.error("GET /api/cron/daily-summary error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
