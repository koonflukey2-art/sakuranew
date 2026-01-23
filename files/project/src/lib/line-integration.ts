// src/lib/line-integration.ts
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

type Maybe<T> = T | null | undefined;

export type LineSettings = {
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
  settings: {
    lineChannelAccessToken?: Maybe<string>;
    lineTargetId?: Maybe<string>;
    notifyOnLowStock?: Maybe<boolean>;
  }
): Promise<void> {
  if (!settings?.notifyOnLowStock) return;
  if (!settings?.lineChannelAccessToken || !settings?.lineTargetId) return;

  if (product.quantity < product.minStockLevel) {
    const message = formatLowStockAlert(product);
    await pushLineMessage(settings.lineTargetId, settings.lineChannelAccessToken, message);
  }
}

// -----------------------------
// Parse LINE order message
// -----------------------------

export function parseLineOrderMessage(message: string): {
  productType: number;
  quantity: number;
  amount: number;
  phone?: string;
  customerName?: string;
  address?: string;
} | null {
  try {
    const raw = (message || "").replace(/\r\n/g, "\n").trim();
    if (!raw) return null;

    // 1) แบบสั้น: "1 2 390" หรือ "1 2 1,390"
    const short = raw.match(/^\s*(\d+)\s+(\d+)\s+([\d,]+(?:\.\d+)?)\s*$/);
    if (short) {
      const productType = parseInt(short[1], 10);
      const quantity = parseInt(short[2], 10);
      const amount = parseFloat(short[3].replace(/,/g, ""));
      if (productType > 0 && quantity > 0 && amount > 0) return { productType, quantity, amount };
      return null;
    }

    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return null;

    // productType: หาเลขบรรทัดแรกที่เป็นเลขล้วน
    let productType: number | null = null;
    for (const l of lines) {
      const m = l.match(/^(\d{1,4})$/);
      if (m) { productType = parseInt(m[1], 10); break; }
    }
    if (!productType) {
      const m = lines[0].match(/(\d{1,4})/);
      productType = m ? parseInt(m[1], 10) : null;
    }

    // quantity: หาเลขบรรทัดท้ายที่เป็นเลขล้วน
    let quantity: number | null = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = lines[i].match(/^(\d{1,4})$/);
      if (m) { quantity = parseInt(m[1], 10); break; }
    }
    if (!quantity) {
      const m = lines[lines.length - 1].match(/(\d{1,4})/);
      quantity = m ? parseInt(m[1], 10) : null;
    }

    // amount: หาเลขจากบรรทัดที่มีคำว่า "ยอด" / "เก็บยอด" / "ยอดเก็บ"
    let amount: number | null = null;
    let amountLineIndex: number | null = null;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/(ยอด|เก็บยอด|ยอดเก็บ)/i.test(l)) {
        const m = l.match(/(\d[\d,]*(?:\.\d+)?)/);
        if (m) {
          amount = parseFloat(m[1].replace(/,/g, ""));
          amountLineIndex = i;
          break;
        }
      }
    }

    // fallback amount: ลองเอาจากบรรทัดที่ 2 ถ้ามีเลข
    if (amount == null && lines.length >= 2) {
      const m = lines[1].match(/(\d[\d,]*(?:\.\d+)?)/);
      if (m) {
        amount = parseFloat(m[1].replace(/,/g, ""));
        amountLineIndex = 1;
      }
    }

    // phone: รองรับ 0912345678 / 098 123 4568 / 095-503-0658
    let phone: string | undefined;
    const phoneMatches = raw.match(/0\d(?:[\s-]?\d){7,9}/g) || [];
    if (phoneMatches.length) {
      const normalized = phoneMatches
        .map((p) => p.replace(/\D/g, ""))
        .filter((p) => p.length >= 9 && p.length <= 10);
      normalized.sort((a, b) => b.length - a.length);
      phone = normalized[0];
    }

    if (!productType || !quantity || !amount) return null;
    if (productType <= 0 || quantity <= 0 || amount <= 0) return null;

    // customerName: เดาเป็นบรรทัดท้ายๆ ที่ไม่ใช่เลข/ไม่ใช่ยอด/ไม่ใช่เบอร์
    let customerName: string | undefined;
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      if (amountLineIndex === i) continue;
      if (/^\d+$/.test(l)) continue;
      if (/(ยอด|เก็บยอด|ยอดเก็บ)/i.test(l)) continue;
      if (phone && l.replace(/\D/g, "").includes(phone)) continue;
      if (/\d/.test(l)) continue; // มีเลขปนเยอะ ๆ มักเป็นที่อยู่
      if (l.length >= 2 && l.length <= 60) { customerName = l; break; }
    }

    // address: เอาบรรทัดที่เหลือ (ตัด productType/quantity/amount/phone/name ออก)
    const drop = new Set<number>();

    // drop productType line (ตัวแรกที่เป็นเลขล้วนเท่ากับ productType)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === String(productType)) { drop.add(i); break; }
    }
    // drop quantity line (ตัวท้ายที่เป็นเลขล้วนเท่ากับ quantity)
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() === String(quantity)) { drop.add(i); break; }
    }
    if (amountLineIndex != null) drop.add(amountLineIndex);
    if (customerName) {
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i] === customerName) { drop.add(i); break; }
      }
    }

    const addrLines = lines.filter((l, i) => {
      if (drop.has(i)) return false;
      if (phone && l.replace(/\D/g, "").includes(phone)) return false;
      return true;
    });

    const address = addrLines.length ? addrLines.join("\n") : undefined;

    return { productType, quantity, amount, phone, customerName, address };
  } catch (error) {
    console.error("Error parsing LINE order message:", error);
    return null;
  }
}

