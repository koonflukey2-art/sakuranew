// LINE Client - Reads tokens from database (SystemSettings)
import { prisma } from "@/lib/prisma";

/**
 * Get LINE settings from database for an organization
 * Falls back to environment variables if database is empty
 */
export async function getLineSettings(organizationId: string) {
  try {
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

    return {
      notifyToken: settings?.lineNotifyToken || process.env.LINE_NOTIFY_TOKEN || null,
      channelToken: settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || null,
      channelSecret: settings?.lineChannelSecret || process.env.LINE_CHANNEL_SECRET || null,
      webhookUrl: settings?.lineWebhookUrl || null,
      notifyOnOrder: settings?.notifyOnOrder ?? true,
      notifyOnLowStock: settings?.notifyOnLowStock ?? true,
      notifyDailySummary: settings?.notifyDailySummary ?? true,
    };
  } catch (error) {
    console.error("Error getting LINE settings:", error);
    // Fallback to environment variables
    return {
      notifyToken: process.env.LINE_NOTIFY_TOKEN || null,
      channelToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || null,
      channelSecret: process.env.LINE_CHANNEL_SECRET || null,
      webhookUrl: null,
      notifyOnOrder: true,
      notifyOnLowStock: true,
      notifyDailySummary: true,
    };
  }
}

/**
 * Send LINE Notify notification
 * @param message - Message to send
 * @param organizationId - Organization ID to get token from
 */
export async function sendLineNotification(
  message: string,
  organizationId: string
): Promise<boolean> {
  try {
    const { notifyToken } = await getLineSettings(organizationId);

    if (!notifyToken) {
      console.warn("LINE Notify token not configured for org:", organizationId);
      return false;
    }

    const response = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notifyToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ message }),
    });

    if (!response.ok) {
      console.error("LINE Notify failed:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("LINE notification error:", error);
    return false;
  }
}

/**
 * Send LINE reply message
 * @param replyToken - Reply token from LINE webhook
 * @param messages - Array of messages to send
 * @param organizationId - Organization ID to get token from
 */
export async function sendLineReply(
  replyToken: string,
  messages: any[],
  organizationId: string
): Promise<boolean> {
  try {
    const { channelToken } = await getLineSettings(organizationId);

    if (!channelToken) {
      console.warn("LINE channel token not configured for org:", organizationId);
      return false;
    }

    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });

    if (!response.ok) {
      console.error("LINE reply failed:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("LINE reply error:", error);
    return false;
  }
}

/**
 * Send LINE push message
 * @param to - User ID or group ID to send to
 * @param messages - Array of messages to send
 * @param organizationId - Organization ID to get token from
 */
export async function sendLinePush(
  to: string,
  messages: any[],
  organizationId: string
): Promise<boolean> {
  try {
    const { channelToken } = await getLineSettings(organizationId);

    if (!channelToken) {
      console.warn("LINE channel token not configured for org:", organizationId);
      return false;
    }

    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        messages,
      }),
    });

    if (!response.ok) {
      console.error("LINE push failed:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("LINE push error:", error);
    return false;
  }
}

/**
 * Verify LINE webhook signature
 * @param body - Request body
 * @param signature - X-Line-Signature header
 * @param organizationId - Organization ID to get secret from
 */
export async function verifyLineSignature(
  body: string,
  signature: string,
  organizationId: string
): Promise<boolean> {
  try {
    const { channelSecret } = await getLineSettings(organizationId);

    if (!channelSecret) {
      console.warn("LINE channel secret not configured for org:", organizationId);
      return false;
    }

    const crypto = require("crypto");
    const hash = crypto
      .createHmac("sha256", channelSecret)
      .update(body)
      .digest("base64");

    return hash === signature;
  } catch (error) {
    console.error("LINE signature verification error:", error);
    return false;
  }
}
