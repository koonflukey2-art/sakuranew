import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineNotify, pushLineMessage } from "@/lib/line-integration";
import { calculateOrderProfit } from "@/lib/profit-calculator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BKK_OFFSET_HOURS = 7;
const MS_HOUR = 3600 * 1000;
const MS_MIN = 60 * 1000;

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

/**
 * คืน start/end ของ "วันนี้" ตาม Bangkok แต่เป็น UTC สำหรับ query DB
 * - startUtc คือ "00:00 BKK" ในรูป UTC (เช่น 17:00Z ของวันก่อน)
 */
function todayWindowBangkok() {
  const bkkNow = toBangkok(new Date());

  const startLocalBkk = new Date(bkkNow);
  startLocalBkk.setHours(0, 0, 0, 0);

  const endLocalBkk = new Date(bkkNow);
  endLocalBkk.setHours(23, 59, 59, 999);

  const startUtc = new Date(startLocalBkk.getTime() - BKK_OFFSET_HOURS * MS_HOUR);
  const endUtc = new Date(endLocalBkk.getTime() - BKK_OFFSET_HOURS * MS_HOUR);

  return {
    startUtc,
    endUtc,
    bkkNow,
    startLocalBkk,
    dateLabel: toThaiDateLabel(bkkNow),
  };
}

const fmtTHB = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("th-TH");

function formatMessage(p: {
  dateLabel: string;
  orderCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  margin: number;
  breakdownLines: string[];
}) {
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

/** ใช้เช็คว่า “เคยส่งวันนี้แล้วหรือยัง” (ตามเวลา BKK) */
function alreadySentToday(args: {
  startLocalBkk: Date;
  lastSentAt: Date | null;
}) {
  const { startLocalBkk, lastSentAt } = args;
  if (!lastSentAt) return false;
  const lastSentBkk = toBangkok(lastSentAt);
  return lastSentBkk.getTime() >= startLocalBkk.getTime();
}

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false as const, reason: "CRON_SECRET_NOT_SET" };

  const auth = req.headers.get("authorization");
  const xcron = req.headers.get("x-cron-secret");

  const ok =
    (auth && auth === `Bearer ${secret}`) || (xcron && xcron === secret);

  return { ok: !!ok, reason: ok ? "OK" : "BAD_SECRET_OR_MISSING_HEADER" };
}

export async function GET(req: Request) {
  try {
    // --- Auth ---
    const auth = isAuthorized(req);
    if (!auth.ok) {
      return NextResponse.json(
        { error: "Unauthorized", reason: auth.reason },
        { status: 401 }
      );
    }

    // --- โหลด org ที่เปิด notifyDailySummary และมี token ใช้งานได้ ---
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
            AND: [
              { lineNotifyToken: { not: null } },
              { lineNotifyToken: { not: "" } },
            ],
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

    const { startUtc, endUtc, bkkNow, startLocalBkk, dateLabel } =
      todayWindowBangkok();

    const results: Array<Record<string, any>> = [];

    for (const s of settings) {
      try {
        const cutOffHour = s.dailyCutOffHour ?? 23;
        const cutOffMinute = s.dailyCutOffMinute ?? 59;

        // ✅ cut-off วันนี้ (ในมุม UTC ของ startUtc ที่แทน 00:00 BKK)
        const cutoffUtc = new Date(
          startUtc.getTime() + cutOffHour * MS_HOUR + cutOffMinute * MS_MIN
        );

        // ถ้ายังไม่ถึงเวลา cut-off -> ข้ามทั้งการสร้าง summary และส่ง line
        if (new Date().getTime() < cutoffUtc.getTime()) {
          results.push({
            organizationId: s.organizationId,
            skipped: true,
            reason: "not_time_yet",
            debug: {
              nowUtc: new Date().toISOString(),
              cutoffUtc: cutoffUtc.toISOString(),
            },
          });
          continue;
        }

        // --- ดึงออเดอร์ใน window วันนี้ (BKK) ---
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

        // --- สรุปยอด + รวมสินค้าแบบละเอียดสำหรับหน้าเว็บ ---
        let totalRevenue = 0;
        let totalCost = 0;

        const map = new Map<
          string,
          {
            productType: number | null;
            productName: string;
            quantity: number;
            revenue: number;
            cost: number;
            profit: number;
          }
        >();

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

          const name =
            (o.productName && o.productName.trim()) ||
            (o.productType != null ? `ประเภท ${o.productType}` : "ไม่ระบุสินค้า");

          const key = `${o.productType ?? "null"}::${name}`;

          const prev =
            map.get(key) ??
            ({
              productType: o.productType ?? null,
              productName: name,
              quantity: 0,
              revenue: 0,
              cost: 0,
              profit: 0,
            } as const);

          const next = {
            productType: prev.productType,
            productName: prev.productName,
            quantity: prev.quantity + (o.quantity || 0),
            revenue: prev.revenue + (o.amount || 0),
            cost: prev.cost + (calc.cost || 0),
            profit: 0,
          };
          next.profit = next.revenue - next.cost;

          map.set(key, next);
        }

        const productsSold = Array.from(map.values()).sort(
          (a, b) => b.quantity - a.quantity
        );

        const breakdownLines = productsSold.map(
          (p) => `• ${p.productName}: ${fmtTHB(p.quantity)} ชิ้น`
        );

        const orderCount = orders.length;
        const totalProfit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        // ✅ 1) สร้าง/อัปเดต DailySummary ลง DB เสมอ (เมื่อถึงเวลา cut-off แล้ว)
        // NOTE: schema ของคุณยังไม่มี @@unique(orgId,date) เลยทำ upsert ตรงๆไม่ได้
        // เราใช้ findFirst -> update/create แทน (ไม่ต้อง migrate)
        const existing = await prisma.dailySummary.findFirst({
          where: {
            organizationId: s.organizationId,
            date: startUtc, // ✅ ใช้ startUtc ให้ match กับ from/to ที่หน้าเว็บส่งมา
          },
          select: { id: true },
        });

        if (existing?.id) {
          await prisma.dailySummary.update({
            where: { id: existing.id },
            data: {
              totalRevenue,
              totalCost,
              totalProfit,
              totalOrders: orderCount,
              productsSold,
              cutOffTime: cutoffUtc,
            },
          });
        } else {
          await prisma.dailySummary.create({
            data: {
              organizationId: s.organizationId,
              date: startUtc,
              totalRevenue,
              totalCost,
              totalProfit,
              totalOrders: orderCount,
              productsSold,
              cutOffTime: cutoffUtc,
            },
          });
        }

        // ✅ 2) ส่ง LINE เฉพาะ “ครั้งแรกของวัน”
        const sentBefore = alreadySentToday({
          startLocalBkk,
          lastSentAt: s.dailySummaryLastSentAt ?? null,
        });

        let sent = false;
        let via: "push" | "notify" | "none" = "none";

        if (!sentBefore) {
          const message = formatMessage({
            dateLabel,
            orderCount,
            totalRevenue,
            totalCost,
            totalProfit,
            margin,
            breakdownLines,
          });

          if (s.lineChannelAccessToken && s.lineTargetId) {
            sent = await pushLineMessage(
              s.lineTargetId,
              s.lineChannelAccessToken,
              message
            );
            via = "push";
          }

          if (!sent && s.lineNotifyToken) {
            sent = await sendLineNotify(s.lineNotifyToken, message);
            if (sent) via = "notify";
          }

          if (sent) {
            await prisma.systemSettings.update({
              where: { organizationId: s.organizationId },
              data: { dailySummaryLastSentAt: new Date() },
            });
          }
        }

        results.push({
          organizationId: s.organizationId,
          summarySaved: true,
          orderCount,
          totalRevenue,
          totalCost,
          totalProfit,
          margin,
          sentBefore,
          sent,
          via,
          debug: {
            startUtc: startUtc.toISOString(),
            endUtc: endUtc.toISOString(),
            cutoffUtc: cutoffUtc.toISOString(),
            bkkNow: bkkNow.toISOString(),
          },
        });
      } catch (err: any) {
        results.push({
          organizationId: s.organizationId,
          error: err?.message ?? String(err),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      window: {
        startUtc: startUtc.toISOString(),
        endUtc: endUtc.toISOString(),
        dateLabel,
      },
      results,
    });
  } catch (error: any) {
    console.error("GET /api/cron/daily-summary error:", error);
    return NextResponse.json(
      { error: error.message || "Failed" },
      { status: 500 }
    );
  }
}
