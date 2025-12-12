// src/lib/line-integration.ts
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

type Maybe<T> = T | null | undefined;

export type LineSettings = {
  lineNotifyToken: string | null;
  lineChannelAccessToken: string | null;
  lineChannelSecret: string | null;
  lineWebhookUrl: string | null;

  // ✅ userId / groupId / roomId
  lineTargetId: string | null;

  notifyOnOrder: boolean;
  notifyOnLowStock: boolean;
  notifyDailySummary: boolean;
};

export async function getLineSettings(
  organizationId: string
): Promise<LineSettings | null> {
  return prisma.systemSettings.findUnique({
    where: { organizationId },
    select: {
      lineNotifyToken: true,
      lineChannelAccessToken: true,
      lineChannelSecret: true,
      lineWebhookUrl: true,
      lineTargetId: true, // ✅ สำคัญ

      notifyOnOrder: true,
      notifyOnLowStock: true,
      notifyDailySummary: true,
    },
  });
}

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
// LINE Notify
// -----------------------------
const LINE_NOTIFY_ENDPOINT = "https://notify-api.line.me/api/notify";
const LINE_NOTIFY_MAX = 1000;

function chunkForNotify(message: string, limit = LINE_NOTIFY_MAX): string[] {
  if (!message) return [];
  if (message.length <= limit) return [message];

  const chunks: string[] = [];
  for (let i = 0; i < message.length; i += limit) {
    chunks.push(message.slice(i, i + limit));
  }
  return chunks;
}

export async function sendLineNotify(
  token: string,
  message: string
): Promise<boolean> {
  try {
    const effectiveToken = token || process.env.LINE_NOTIFY_TOKEN || "";
    if (!effectiveToken) {
      console.error("LINE Notify: missing token");
      return false;
    }
    if (!message?.trim()) {
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

      let json: any;
      try {
        json = await res.json();
      } catch {}

      const ok = res.ok && (json?.status === 200 || json?.message === "ok");
      if (!ok) {
        allOk = false;
        console.error(
          "LINE Notify failed:",
          res.status,
          json ?? (await res.text())
        );
      }
    }

    if (allOk) console.log("✅ LINE Notify sent successfully");
    return allOk;
  } catch (error) {
    console.error("LINE Notify error:", error);
    return false;
  }
}

// -----------------------------
// Messaging API
// -----------------------------
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
// Format helpers
// -----------------------------
export function formatOrderConfirmation(order: {
  orderNumber?: string;
  id: string;
  productType?: number;
  productName?: string;
  quantity: number;
  amount: number;
}): string {
  const orderNum = order.orderNumber || order.id.slice(0, 8).toUpperCase();
  const productInfo =
    order.productName || `สินค้าหมายเลข ${order.productType ?? "-"}`;

  return (
    `✅ รับออเดอร์แล้ว!\n\n` +
    `📦 เลขที่: ${orderNum}\n` +
    `🛍️ สินค้า: ${productInfo}\n` +
    `📊 จำนวน: ${order.quantity} ชิ้น\n` +
    `💰 ยอดเงิน: ฿${order.amount.toLocaleString("th-TH")}\n\n` +
    `ขอบคุณที่ใช้บริการค่ะ 🙏`
  );
}

export function formatLowStockAlert(product: {
  name: string;
  quantity: number;
  minStockLevel: number;
}): string {
  return (
    `⚠️ แจ้งเตือนสต็อกต่ำ!\n\n` +
    `📦 สินค้า: ${product.name}\n` +
    `📊 เหลือในสต็อก: ${product.quantity} ชิ้น\n` +
    `⚡ ขั้นต่ำ: ${product.minStockLevel} ชิ้น\n\n` +
    `กรุณาเติมสต็อกโดยเร็วที่สุด!`
  );
}

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

export async function checkAndNotifyLowStock(
  product: { name: string; quantity: number; minStockLevel: number },
  settings: { lineNotifyToken?: Maybe<string>; notifyOnLowStock?: Maybe<boolean> }
): Promise<void> {
  if (!settings?.notifyOnLowStock || !settings?.lineNotifyToken) return;

  if (product.quantity < product.minStockLevel) {
    const message = formatLowStockAlert(product);
    await sendLineNotify(settings.lineNotifyToken, message);
  }
}
