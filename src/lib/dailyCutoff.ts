// lib/dailyCutoff.ts
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface ProductBreakdownItem {
  productType: number | null;
  productName: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

interface DailySummaryLike {
  id: string;
  date: Date;
  organizationId: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalOrders: number;
  productsSold: ProductBreakdownItem[];
  cutOffTime: Date;
}

// สร้าง summary ให้ org เดียว ในวันที่กำหนด (default = วันนี้)
export async function createDailySummaryForOrg(
  organizationId: string,
  targetDate?: Date
): Promise<{ summary: DailySummaryLike; created: boolean }> {
  const now = new Date();
  const base = targetDate ? new Date(targetDate) : now;

  const startOfDay = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate()
  );
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  // กันซ้ำ – ถ้ามี summary วันนี้แล้วให้คืนอันเดิมกลับไป
  const existingSummary = await prisma.dailySummary.findFirst({
    where: {
      organizationId,
      date: startOfDay,
    },
  });

  if (existingSummary) {
    return { summary: existingSummary as any, created: false };
  }

  // ดึง orders วันนี้
  const orders = await prisma.order.findMany({
    where: {
      organizationId,
      orderDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });

  // ดึง product ทั้งหมดไว้ใช้ดูต้นทุน
  const products = await prisma.product.findMany({
    where: { organizationId },
  });

  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  const productBreakdown: Record<string, ProductBreakdownItem> = {};

  orders.forEach((order) => {
    totalRevenue += order.amount;

    const product = products.find((p) => p.productType === order.productType);
    const costPrice = product ? product.costPrice : 0;
    const cost = costPrice * order.quantity;
    totalCost += cost;
    totalProfit += order.amount - cost;

    const key = order.productType?.toString() || "unknown";

    if (!productBreakdown[key]) {
      productBreakdown[key] = {
        productType: order.productType ?? null,
        productName:
          product?.name ||
          order.productName ||
          `สินค้าหมายเลข ${order.productType ?? "-"}`,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
    }

    productBreakdown[key].quantity += order.quantity;
    productBreakdown[key].revenue += order.amount;
    productBreakdown[key].cost += cost;
    productBreakdown[key].profit += order.amount - cost;
  });

  // แปลง breakdown เป็น Prisma.JsonArray ให้ตรง type JSON ของ Prisma
  const breakdownArray: Prisma.JsonArray = Object.values(productBreakdown).map(
    (item) => ({
      ...item,
    })
  ) as Prisma.JsonArray;

  const summary = await prisma.dailySummary.create({
    data: {
      date: startOfDay,
      organizationId,
      totalRevenue,
      totalCost,
      totalProfit,
      totalOrders: orders.length,
      productsSold: breakdownArray, // ✅ ตอนนี้ type ตรงกับ JSON แล้ว
      cutOffTime: now,
    },
  });

  // หลังจากสร้าง summary แล้ว → ลองส่ง LINE ถ้าตั้งค่าไว้
  await sendDailySummaryToLine(organizationId, summary as any);

  return { summary: summary as any, created: true };
}

// ------- LINE Notify helper -------

async function sendDailySummaryToLine(
  organizationId: string,
  summary: DailySummaryLike
) {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { organizationId },
    });

    if (!settings?.notifyDailySummary || !settings.lineNotifyToken) {
      // ไม่ได้เปิด notify หรือไม่มี token → ไม่ต้องส่ง
      return;
    }

    const msg = buildLineDailySummaryMessage(summary);

    await sendLineNotify(settings.lineNotifyToken, msg);
  } catch (err) {
    console.error("Failed to send LINE daily summary:", err);
  }
}

function buildLineDailySummaryMessage(summary: DailySummaryLike): string {
  const dateStr = new Date(summary.date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let message = `📊 สรุปยอดขายประจำวันที่ ${dateStr}\n\n`;
  message += `💰 รายได้รวม: ฿${summary.totalRevenue.toLocaleString()}\n`;
  message += `🧾 ต้นทุนรวม: ฿${summary.totalCost.toLocaleString()}\n`;
  message += `🏆 กำไรรวม: ฿${summary.totalProfit.toLocaleString()}\n`;
  message += `🛒 ออเดอร์ทั้งหมด: ${summary.totalOrders} ออเดอร์\n`;

  if (Array.isArray(summary.productsSold) && summary.productsSold.length > 0) {
    const top = [...summary.productsSold]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    message += `\n🔥 สินค้าขายดี:\n`;
    top.forEach((p, idx) => {
      message += `${idx + 1}. ${p.productName} - ${p.quantity} ชิ้น (฿${p.revenue.toLocaleString()})\n`;
    });
  }

  return message;
}

async function sendLineNotify(token: string, message: string) {
  const body = new URLSearchParams({ message });

  const res = await fetch("https://notify-api.line.me/api/notify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn("LINE Notify error:", res.status, text);
  }
}
