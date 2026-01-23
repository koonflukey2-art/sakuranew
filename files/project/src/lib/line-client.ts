// src/lib/line-client.ts
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export type LineSettings = {
  organizationId: string | null;
  notifyToken: string | null;
  channelToken: string | null;
  channelSecret: string | null;
  webhookUrl: string | null;
  notifyOnOrder: boolean;
  notifyOnLowStock: boolean;
  notifyDailySummary: boolean;
};

/**
 * =============================
 *  STOCK / ORDER LINE BOT
 *  (ใช้ field lineXXX ใน SystemSettings)
 * =============================
 */
export async function getLineSettings(
  organizationId?: string
): Promise<LineSettings> {
  try {
    let settings: any = null;

    if (organizationId) {
      settings = await prisma.systemSettings.findUnique({
        where: { organizationId },
      });
    } else {
      settings = await prisma.systemSettings.findFirst({
        where: {
          OR: [
            { lineChannelAccessToken: { not: null } },
            { lineNotifyToken: { not: null } },
          ],
        },
      });
    }

    if (!settings) {
      // ไม่มีใน DB → fallback env เดิม
      return {
        organizationId: organizationId ?? null,
        notifyToken: process.env.LINE_NOTIFY_TOKEN || null,
        channelToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || null,
        channelSecret: process.env.LINE_CHANNEL_SECRET || null,
        webhookUrl: null,
        notifyOnOrder: true,
        notifyOnLowStock: true,
        notifyDailySummary: true,
      };
    }

    return {
      organizationId: settings.organizationId ?? organizationId ?? null,
      notifyToken:
        settings.lineNotifyToken || process.env.LINE_NOTIFY_TOKEN || null,
      channelToken:
        settings.lineChannelAccessToken ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN ||
        null,
      channelSecret:
        settings.lineChannelSecret || process.env.LINE_CHANNEL_SECRET || null,
      webhookUrl: settings.lineWebhookUrl || null,
      notifyOnOrder: settings.notifyOnOrder ?? true,
      notifyOnLowStock: settings.notifyOnLowStock ?? true,
      notifyDailySummary: settings.notifyDailySummary ?? true,
    };
  } catch (error) {
    console.error("Error getting LINE settings:", error);
    return {
      organizationId: organizationId ?? null,
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
 * =============================
 *  ADS LINE BOT (Facebook Ads Statements)
 *  ใช้ field adsLineXXX ใน SystemSettings
 * =============================
 */
export async function getLineAdsSettings(
  organizationId?: string
): Promise<LineSettings> {
  try {
    let settings: any = null;

    if (organizationId) {
      settings = await prisma.systemSettings.findUnique({
        where: { organizationId },
      });
    } else {
      settings = await prisma.systemSettings.findFirst({
        where: {
          OR: [
            { adsLineChannelAccessToken: { not: null } },
            { adsLineNotifyToken: { not: null } },
          ],
        },
      });
    }

    if (!settings) {
      // fallback เป็น env ของ Ads (ถ้ามี)
      return {
        organizationId: organizationId ?? null,
        notifyToken: process.env.ADS_LINE_NOTIFY_TOKEN || null,
        channelToken: process.env.ADS_LINE_CHANNEL_ACCESS_TOKEN || null,
        channelSecret: process.env.ADS_LINE_CHANNEL_SECRET || null,
        webhookUrl: null,
        notifyOnOrder: true,
        notifyOnLowStock: true,
        notifyDailySummary: true,
      };
    }

    return {
      organizationId: settings.organizationId ?? organizationId ?? null,
      notifyToken:
        settings.adsLineNotifyToken ||
        process.env.ADS_LINE_NOTIFY_TOKEN ||
        null,
      channelToken:
        settings.adsLineChannelAccessToken ||
        process.env.ADS_LINE_CHANNEL_ACCESS_TOKEN ||
        null,
      channelSecret:
        settings.adsLineChannelSecret ||
        process.env.ADS_LINE_CHANNEL_SECRET ||
        null,
      webhookUrl: settings.adsLineWebhookUrl || null,
      notifyOnOrder: settings.notifyOnOrder ?? true,
      notifyOnLowStock: settings.notifyOnLowStock ?? true,
      notifyDailySummary: settings.notifyDailySummary ?? true,
    };
  } catch (error) {
    console.error("Error getting LINE Ads settings:", error);
    return {
      organizationId: organizationId ?? null,
      notifyToken: process.env.ADS_LINE_NOTIFY_TOKEN || null,
      channelToken: process.env.ADS_LINE_CHANNEL_ACCESS_TOKEN || null,
      channelSecret: process.env.ADS_LINE_CHANNEL_SECRET || null,
      webhookUrl: null,
      notifyOnOrder: true,
      notifyOnLowStock: true,
      notifyDailySummary: true,
    };
  }
}

/**
 * ส่ง LINE Notify (generic ใช้กับ stock/ads ได้)
 */
export async function sendLineNotification(
  message: string,
  organizationId?: string,
  useAdsBot: boolean = false
): Promise<boolean> {
  try {
    const { notifyToken } = useAdsBot
      ? await getLineAdsSettings(organizationId)
      : await getLineSettings(organizationId);

    if (!notifyToken) {
      console.warn("LINE Notify token not configured");
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

    console.log("✅ LINE Notify sent successfully");
    return true;
  } catch (error) {
    console.error("LINE notification error:", error);
    return false;
  }
}

/**
 * ส่ง reply message กลับไปที่ LINE (ใช้ replyToken)
 */
export async function sendLineReply(
  replyToken: string,
  messages: any[],
  organizationId?: string,
  useAdsBot: boolean = false
): Promise<boolean> {
  try {
    const { channelToken } = useAdsBot
      ? await getLineAdsSettings(organizationId)
      : await getLineSettings(organizationId);

    if (!channelToken) {
      console.warn("LINE channel token not configured");
      return false;
    }

    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ replyToken, messages }),
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
 * ส่ง push message (ใช้ userId / groupId)
 */
export async function sendLinePush(
  to: string,
  messages: any[],
  organizationId?: string,
  useAdsBot: boolean = false
): Promise<boolean> {
  try {
    const { channelToken } = useAdsBot
      ? await getLineAdsSettings(organizationId)
      : await getLineSettings(organizationId);

    if (!channelToken) {
      console.warn("LINE channel token not configured");
      return false;
    }

    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, messages }),
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
 * verify signature สำหรับ STOCK BOT (lineXXX)
 */
export async function verifyLineSignature(
  body: string,
  signature: string,
  organizationId?: string
): Promise<boolean> {
  try {
    const { channelSecret } = await getLineSettings(organizationId);

    if (!channelSecret) {
      console.warn("LINE channel secret not configured");
      return false;
    }

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

/**
 * verify signature สำหรับ ADS BOT (adsLineXXX)
 */
export async function verifyLineAdsSignature(
  body: string,
  signature: string,
  organizationId?: string
): Promise<boolean> {
  try {
    const { channelSecret } = await getLineAdsSettings(organizationId);

    if (!channelSecret) {
      console.warn("LINE Ads channel secret not configured");
      return false;
    }

    const hash = crypto
      .createHmac("sha256", channelSecret)
      .update(body)
      .digest("base64");

    return hash === signature;
  } catch (error) {
    console.error("LINE Ads signature verification error:", error);
    return false;
  }
}
