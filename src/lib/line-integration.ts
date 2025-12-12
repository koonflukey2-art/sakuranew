// src/lib/line-integration.ts
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// -----------------------------
// Types
// -----------------------------
type Maybe<T> = T | null | undefined;

// -----------------------------
// Settings helpers
// -----------------------------

/**
 * ดึง LINE settings ของ organization จาก SystemSettings
 */
export async function getLineSettings(organizationId: string) {
  const settings = await prisma.systemSettings.findUnique({
    where: { organizationId },
    select: {
      lineNotifyToken: true,
      lineChannelAccessToken: true,
      lineChannelSecret: true,
      lineWebhookUrl: true,
      notifyOnOrder: true,
      notifyOnLowStock: true,
      notifyDailySummary: true,
    },
  });

  return settings;
}

// -----------------------------
// Security / Signature
// -----------------------------

/**
 * ตรวจสอบ LINE webhook signature (Messaging API)
 */
export function verifyLineSignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  try {
    const hash = crypto
      .createHmac("SHA256", channelSecret)
      .update(body)
      .digest("base64");

    return hash === signature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// -----------------------------
// LINE Notify (สำหรับส่งแจ้งเตือนเข้าห้อง/ผู้ใช้ ด้วย token ส่วนตัว)
// -----------------------------

const LINE_NOTIFY_ENDPOINT = "https://notify-api.line.me/api/notify";
// ข้อจำกัด LINE Notify: ข้อความไม่ควรยาวเกิน ~1000 ตัวอักษร
const LINE_NOTIFY_MAX = 1000;

/**
 * แบ่งข้อความเป็นหลายส่วนถ้าเกินลิมิต (ใช้กับ LINE Notify)
 */
function chunkForNotify(message: string, limit = LINE_NOTIFY_MAX): string[] {
  if (!message) return [];
  if (message.length <= limit) return [message];

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < message.length) {
    chunks.push(message.slice(cursor, cursor + limit));
    cursor += limit;
  }
  return chunks;
}

/**
 * ส่งข้อความเข้า LINE Notify
 * - คืนค่า true หากสำเร็จ (ทุกชิ้นส่วนสำเร็จหากต้องแบ่งข้อความ)
 * - หากมีบางชิ้นส่วนล้มเหลว จะคืน false
 * - token สามารถมาจาก DB หรือ ENV ก็ได้
 */
export async function sendLineNotify(token: string, message: string): Promise<boolean> {
  try {
    const effectiveToken = token || process.env.LINE_NOTIFY_TOKEN || "";
    if (!effectiveToken) {
      console.error("LINE Notify: missing token");
      return false;
    }
    if (!message || !message.trim()) {
      console.error("LINE Notify: empty message");
      return false;
    }

    const parts = chunkForNotify(message);
    let allOk = true;

    for (const part of parts) {
      const res = await fetch(LINE_NOTIFY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: new URLSearchParams({ message: part }),
        cache: "no-store",
      });

      // ปกติจะได้ { status:200, message:"ok" }
      let json: any;
      try {
        json = await res.json();
      } catch {
        // บางครั้งอาจตอบไม่ใช่ JSON
      }

      const ok = res.ok && (json?.status === 200 || json?.message === "ok");
      if (!ok) {
        allOk = false;
        console.error("LINE Notify failed:", res.status, json ?? (await res.text()));
      }
    }

    if (allOk) {
      console.log("✅ LINE Notify sent successfully");
    }
    return allOk;
  } catch (error) {
    console.error("LINE Notify error:", error);
    return false;
  }
}

// -----------------------------
// Messaging API (Official Account)
// -----------------------------

/**
 * ตอบกลับข้อความแบบ reply (ต้องใช้ replyToken จาก webhook)
 */
export async function replyLineMessage(
  replyToken: string,
  channelAccessToken: string,
  message: string
): Promise<boolean> {
  try {
    if (!replyToken || !channelAccessToken) {
      console.error("LINE reply: missing token or replyToken");
      return false;
    }
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!response.ok) {
      console.error("LINE reply failed:", await response.text());
      return false;
    }

    console.log("✅ LINE reply sent successfully");
    return true;
  } catch (error) {
    console.error("LINE reply error:", error);
    return false;
  }
}

/**
 * push ข้อความหา userId/roomId/groupId (ไม่ต้องใช้ replyToken)
 */
export async function pushLineMessage(
  to: string,
  channelAccessToken: string,
  message: string
): Promise<boolean> {
  try {
    if (!to || !channelAccessToken) {
      console.error("LINE push: missing 'to' or channelAccessToken");
      return false;
    }
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!response.ok) {
      console.error("LINE push failed:", await response.text());
      return false;
    }

    console.log("✅ LINE push sent successfully");
    return true;
  } catch (error) {
    console.error("LINE push error:", error);
    return false;
  }
}

/**
 * broadcast ข้อความหา follower ทั้งหมดของ Official Account
 * (ต้องเปิดสิทธิ์/แพ็คเกจที่รองรับ)
 */
export async function broadcastLineMessage(
  channelAccessToken: string,
  message: string
): Promise<boolean> {
  try {
    if (!channelAccessToken) {
      console.error("LINE broadcast: missing channelAccessToken");
      return false;
    }
    const response = await fetch("https://api.line.me/v2/bot/message/broadcast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({ messages: [{ type: "text", text: message }] }),
    });

    if (!response.ok) {
      console.error("LINE broadcast failed:", await response.text());
      return false;
    }

    console.log("✅ LINE broadcast sent successfully");
    return true;
  } catch (error) {
    console.error("LINE broadcast error:", error);
    return false;
  }
}

// -----------------------------
// Message format helpers
// -----------------------------

/**
 * สร้างข้อความยืนยันออเดอร์สำหรับแจ้งทาง LINE
 */
export function formatOrderConfirmation(order: {
  orderNumber?: string;
  id: string;
  productType?: number;
  productName?: string;
  quantity: number;
  amount: number;
}): string {
  const orderNum = order.orderNumber || order.id.slice(0, 8).toUpperCase();
  const productInfo = order.productName || `สินค้าหมายเลข ${order.productType ?? "-"}`;

  return (
    `✅ รับออเดอร์แล้ว!\n` +
    `\n` +
    `📦 เลขที่: ${orderNum}\n` +
    `🛍️ สินค้า: ${productInfo}\n` +
    `📊 จำนวน: ${order.quantity} ชิ้น\n` +
    `💰 ยอดเงิน: ฿${order.amount.toLocaleString("th-TH")}\n` +
    `\n` +
    `ขอบคุณที่ใช้บริการค่ะ 🙏`
  );
}

/**
 * สร้างข้อความแจ้งเตือนสต็อกต่ำ
 */
export function formatLowStockAlert(product: {
  name: string;
  quantity: number;
  minStockLevel: number;
}): string {
  return (
    `⚠️ แจ้งเตือนสต็อกต่ำ!\n` +
    `\n` +
    `📦 สินค้า: ${product.name}\n` +
    `📊 เหลือในสต็อก: ${product.quantity} ชิ้น\n` +
    `⚡ ขั้นต่ำ: ${product.minStockLevel} ชิ้น\n` +
    `\n` +
    `กรุณาเติมสต็อกโดยเร็วที่สุด!`
  );
}

/**
 * สร้างข้อความสรุปยอดรายวัน (ใช้ได้ทั้ง Notify และ Messaging API)
 */
export function formatDailySummary(payload: {
  dateLabel: string;
  orderCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  margin: number;
}) {
  const thb = (n: number) => n.toLocaleString("th-TH");
  return (
    `📊 สรุปยอดประจำวัน ${payload.dateLabel}\n\n` +
    `📦 ออเดอร์: ${payload.orderCount} รายการ\n` +
    `💰 รายได้: ฿${thb(payload.totalRevenue)}\n` +
    `💵 ต้นทุน: ฿${thb(payload.totalCost)}\n` +
    `✨ กำไรสุทธิ: ฿${thb(payload.totalProfit)}\n` +
    `📈 Margin: ${payload.margin.toFixed(2)}%`
  );
}

// -----------------------------
// Stock helpers
// -----------------------------

/**
 * ตรวจว่าของต่ำกว่า minStock แล้วส่งแจ้งเตือนผ่าน LINE Notify ถ้าเปิดไว้
 */
export async function checkAndNotifyLowStock(
  product: { name: string; quantity: number; minStockLevel: number },
  settings: { lineNotifyToken?: Maybe<string>; notifyOnLowStock?: Maybe<boolean> }
): Promise<void> {
  if (!settings?.notifyOnLowStock || !settings?.lineNotifyToken) {
    return;
  }
  if (product.quantity < product.minStockLevel) {
    const message = formatLowStockAlert(product);
    await sendLineNotify(settings.lineNotifyToken, message);
  }
}
