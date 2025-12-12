// src/app/api/cron/daily-summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLineNotify } from "@/lib/line-integration";
import { calculateOrderProfit } from "@/lib/profit-calculator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** คืนช่วงเวลา “วันนี้ของกรุงเทพฯ” เป็น UTC สำหรับ query DB */
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
  // --------- Auth: “ใช้ Bearer เท่านั้น” ----------
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization"); // e.g. "Bearer xxx"
  if (!secret || !auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --------- หา org ที่เปิดส่งสรุปและมี LINE token ----------
  const settings = await prisma.systemSettings.findMany({
    where: { notifyDailySummary: true, lineNotifyToken: { not: null } },
    select: { organizationId: true, lineNotifyToken: true },
  });

  const { startUtc, endUtc, dateLabel } = todayWindowBangkok();
  const results: Array<Record<string, any>> = [];

  for (const s of settings) {
    try {
      // ดึงออเดอร์วันนี้ของ org
      const orders = await prisma.order.findMany({
        where: {
          organizationId: s.organizationId,
          orderDate: { gte: startUtc, lte: endUtc },
        },
        select: { productType: true, quantity: true, amount: true },
      });

      // ถ้าไม่มีออเดอร์ก็ส่งข้อความ “0” ได้เลย
      if (orders.length === 0) {
        const message = formatMessage({
          dateLabel,
          orderCount: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          margin: 0,
        });
        const sent = await sendLineNotify(s.lineNotifyToken!, message);
        results.push({
          organizationId: s.organizationId,
          orderCount: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          margin: 0,
          sent,
        });
        continue;
      }

      // รวมยอดรายได้/ต้นทุนโดยคิดโปรโมชันต่อออเดอร์
      let totalRevenue = 0;
      let totalCost = 0;

      for (const o of orders) {
        totalRevenue += o.amount;

        // ลำดับอาร์กิวเมนต์ที่ถูกต้อง: (orderLikeObject, organizationId)
        const calc = await calculateOrderProfit(
          {
            productType: o.productType,
            quantity: o.quantity,
            amount: o.amount,
          },
          s.organizationId
        );

        totalCost += calc.cost; // ต้นทุนหลังหักโปรโมชัน
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

      const sent = await sendLineNotify(s.lineNotifyToken!, message);

      results.push({
        organizationId: s.organizationId,
        orderCount,
        totalRevenue,
        totalCost,
        totalProfit,
        margin,
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
