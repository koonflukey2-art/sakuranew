import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineNotify, pushLineMessage } from "@/lib/line-integration";
import { calculateOrderProfit } from "@/lib/profit-calculator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function formatMessage(p: {
  dateLabel: string;
  orderCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  margin: number;
}) {
  return (
    `📊 สรุปยอดประจำวัน ${p.dateLabel}\n\n` +
    `📦 ออเดอร์: ${p.orderCount} รายการ\n` +
    `💰 รายได้: ฿${fmtTHB(p.totalRevenue)}\n` +
    `💵 ต้นทุน: ฿${fmtTHB(p.totalCost)}\n` +
    `✨ กำไรสุทธิ: ฿${fmtTHB(p.totalProfit)}\n` +
    `📈 Margin: ${p.margin.toFixed(2)}%`
  );
}

export async function GET(req: Request) {
  // --- Auth (รองรับ Authorization และ X-Cron-Secret)
  const secret = process.env.CRON_SECRET;
  const ok =
    !!secret &&
    (req.headers.get("authorization") === `Bearer ${secret}` ||
      req.headers.get("x-cron-secret") === secret);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // --- องค์กรที่เปิดส่งสรุปรายวัน
  const settings = await prisma.systemSettings.findMany({
    where: { notifyDailySummary: true },
    select: {
      organizationId: true,
      lineChannelAccessToken: true, // สำหรับ push (Messaging API)
      lineTargetId: true,           // ✅ userId/groupId/roomId
      lineNotifyToken: true,        // fallback (LINE Notify)
    },
  });

  const { startUtc, endUtc, dateLabel } = todayWindowBangkok();
  const results: Array<Record<string, any>> = [];

  for (const s of settings) {
    try {
      const orders = await prisma.order.findMany({
        where: {
          organizationId: s.organizationId,
          orderDate: { gte: startUtc, lte: endUtc },
        },
        select: { productType: true, quantity: true, amount: true },
      });

      let totalRevenue = 0;
      let totalCost = 0;

      for (const o of orders) {
        totalRevenue += o.amount;
        const calc = await calculateOrderProfit(
          {
            productType: o.productType!, // ใน schema เป็น Int? เลยใช้ !
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
      });

      // --- ส่ง: push ก่อน, ถ้าไม่ได้ค่อย fallback ไป Notify
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
