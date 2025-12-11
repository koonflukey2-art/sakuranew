import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Get LINE settings for organization from SystemSettings table
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
    },
  });

  return settings;
}

/**
 * Verify LINE webhook signature for security
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

/**
 * Send LINE Notify message
 */
export async function sendLineNotify(
  token: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: new URLSearchParams({ message }),
    });

    if (!response.ok) {
      console.error("LINE Notify failed:", await response.text());
      return false;
    }

    console.log("✅ LINE Notify sent successfully");
    return true;
  } catch (error) {
    console.error("LINE Notify error:", error);
    return false;
  }
}

/**
 * Reply to LINE message
 */
export async function replyLineMessage(
  replyToken: string,
  channelAccessToken: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
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
 * Format order confirmation message for LINE
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
  const productInfo = order.productName || `สินค้าหมายเลข ${order.productType}`;

  return (
    `✅ รับออเดอร์แล้ว!\n` +
    `\n` +
    `📦 เลขที่: ${orderNum}\n` +
    `🛍️ สินค้า: ${productInfo}\n` +
    `📊 จำนวน: ${order.quantity} ชิ้น\n` +
    `💰 ยอดเงิน: ฿${order.amount.toLocaleString()}\n` +
    `\n` +
    `ขอบคุณที่ใช้บริการค่ะ 🙏`
  );
}

/**
 * Format low stock alert message for LINE
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
 * Check if product stock is low and send notification
 */
export async function checkAndNotifyLowStock(
  product: { name: string; quantity: number; minStockLevel: number },
  settings: { lineNotifyToken?: string | null; notifyOnLowStock?: boolean }
): Promise<void> {
  if (!settings.notifyOnLowStock || !settings.lineNotifyToken) {
    return;
  }

  if (product.quantity < product.minStockLevel) {
    const message = formatLowStockAlert(product);
    await sendLineNotify(settings.lineNotifyToken, message);
  }
}
