// src/app/api/cron/daily-summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineNotify, pushLineMessage } from "@/lib/line-integration";
import { calculateOrderProfit } from "@/lib/profit-calculator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** แปลงเป็นหน้าวันนี้ตาม Asia/Bangkok แล้วคืนช่วงเวลาแบบ UTC สำหรับ query DB */
function todayWindowBangkok() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const bkkNow = new Date(utcMs + 7 * 3600 * 1000);

  const startLocal = new Date(bkkNow);
  startLocal.setHours(0, 0, 0, 0);

  const endLocal = new Date(bkkNow);
  endLocal.setHours(23, 59, 59, 999);

  const startUtc = new Date(startLocal.getTime() - 7 * 3600 * 1000);
  const endUtc = new Date(endLocal.getTime() - 7 * 3600 * 1000);

  return { startUtc, endUtc, dateLabel: toThaiDateLabel(bkkNow) };
}

function toThaiDateLabel(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const fmtTHB = (n: number) => n.toLocaleString("th-TH");

type SummaryParams = {
  dateLabel: string;
  orderCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  margin: number;
  breakdownLines: string[]; // ✅ เพิ่ม
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
  // key = ชื่อสินค้า (ถ้ามี) ไม่งั้นใช้ productType
  const map = new Map<string, number>();

  for (const o of orders) {
    const name =
      (o.productName && o.productName.trim()) ||
      (o.productType != null ? `ประเภท ${o.productType}` : "ไม่ระบุสินค้า");

    map.set(name, (map.get(name) ?? 0) + (o.quantity || 0));
  }

  // เรียงจากมากไปน้อย
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, qty]) => `• ${name}: ${fmtTHB(qty)} ชิ้น`);
}

export async function GET(req: Request) {
  // --- Auth: รองรับทั้ง Authorization: Bearer <secret> และ X-Cron-Secret ---
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const xcron = req.headers.get("x-cron-secret");

  const authorized =
    !!secret &&
    ((auth && auth === `Bearer ${secret}`) || (xcron && xcron === secret));

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- ดึง org ที่เปิดส่งสรุป + มีช่องทางส่ง (push หรือ notify อย่างใดอย่างหนึ่ง) ---
  const settings = await prisma.systemSettings.findMany({
    where: {
      notifyDailySummary: true,
      OR: [
        { lineChannelAccessToken: { not: null }, lineTargetId: { not: null } },
        { lineNotifyToken: { not: null } },
      ],
    },
    select: {
      organizationId: true,
      lineChannelAccessToken: true,
      lineTargetId: true,
      lineNotifyToken: true,
    },
  });

  const { startUtc, endUtc, dateLabel } = todayWindowBangkok();
  const results: Array<Record<string, any>> = [];

  for (const s of settings) {
    try {
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

      // ✅ breakdown ต่อสินค้า
      const breakdownLines = buildBreakdownLines(orders);

      // --- รวมยอดแบบคิดโปรโมชันต่อออเดอร์ ---
      let totalRevenue = 0;
      let totalCost = 0;

      for (const o of orders) {
        totalRevenue += o.amount;

        const calc = await calculateOrderProfit(
          {
            productType: o.productType ?? 0, // ถ้า null ให้กันพัง
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
      results.push({
        organizationId: s.organizationId,
        error: err?.message ?? String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
