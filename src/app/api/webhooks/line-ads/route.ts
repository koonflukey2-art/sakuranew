import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { processStatementPDF } from "@/lib/line-ads-integration";

export const runtime = "nodejs";

/**
 * Verify LINE webhook signature
 */
function verifySignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

/**
 * Send reply to LINE
 */
async function replyMessage(
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
        messages: [{ type: "text", text: message }],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("LINE reply error:", error);
    return false;
  }
}

/**
 * Download file (PDF) from LINE
 */
async function downloadLineFile(
  messageId: string,
  channelAccessToken: string
): Promise<{ buffer: Buffer; fileName: string } | null> {
  try {
    const response = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      {
        headers: {
          Authorization: `Bearer ${channelAccessToken}`,
        },
      }
    );

    if (!response.ok) return null;

    // Try to get filename from Content-Disposition header
    const contentDisposition = response.headers.get("content-disposition");
    const fileNameMatch = contentDisposition?.match(/filename="?(.+?)"?$/);
    const fileName = fileNameMatch
      ? fileNameMatch[1]
      : `statement-${messageId}.pdf`;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return { buffer, fileName };
  } catch (error) {
    console.error("Download LINE file error:", error);
    return null;
  }
}

/**
 * Send LINE Notify message
 */
async function sendLineNotify(
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

    return response.ok;
  } catch (error) {
    console.error("LINE Notify error:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("x-line-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // Get LINE Ads settings
    const settings = await prisma.systemSettings.findFirst({
      where: {
        adsLineChannelSecret: { not: null },
      },
    });

    if (!settings?.adsLineChannelSecret) {
      console.error("LINE Ads Channel Secret not configured");
      return NextResponse.json(
        { error: "LINE Ads not configured" },
        { status: 500 }
      );
    }

    // Verify signature
    const isValid = verifySignature(
      body,
      signature,
      settings.adsLineChannelSecret
    );

    if (!isValid) {
      console.error("Invalid LINE Ads signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const data = JSON.parse(body);
    const events = data.events || [];

    for (const event of events) {
      // Handle file message (statement PDF)
      if (event.type === "message" && event.message.type === "file") {
        const messageId = event.message.id;
        const replyToken = event.replyToken;
        const originalFileName = event.message.fileName || "statement.pdf";

        if (!settings.adsLineChannelAccessToken) {
          console.error("LINE Ads Channel Access Token not configured");
          continue;
        }

        // Download PDF file
        const fileData = await downloadLineFile(
          messageId,
          settings.adsLineChannelAccessToken
        );

        if (!fileData) {
          await replyMessage(
            replyToken,
            settings.adsLineChannelAccessToken,
            "❌ ไม่สามารถดาวน์โหลดไฟล์ได้"
          );
          continue;
        }

        // Process statement PDF
        const statementData = await processStatementPDF(
          fileData.buffer,
          originalFileName,
          settings.organizationId
        );

        if (!statementData) {
          await replyMessage(
            replyToken,
            settings.adsLineChannelAccessToken,
            "❌ ไม่สามารถอ่านข้อมูลจากสเตทเมนต์ได้\n\n" +
              "กรุณาตรวจสอบ:\n" +
              "• ไฟล์เป็น PDF จาก Meta Ads\n" +
              "• ไฟล์ไม่เสียหาย\n" +
              "• มีข้อมูลรอบบิลและยอดเงิน"
          );
          continue;
        }

        // Create statement record in database
        const statement = await prisma.facebookAdsStatement.create({
          data: {
            organizationId: settings.organizationId,
            period: statementData.period,
            startDate: statementData.startDate,
            endDate: statementData.endDate,
            totalAmount: statementData.totalAmount,
            vat: statementData.vat,
            fileUrl: statementData.fileUrl,
            fileName: statementData.fileName,
            fileHash: statementData.fileHash,
            source: "LINE",
            lineMessageId: messageId,
            isProcessed: false,
          },
        });

        // Send success reply
        await replyMessage(
          replyToken,
          settings.adsLineChannelAccessToken,
          `✅ รับสเตทเมนต์แล้ว!\n\n` +
            `รอบบิล: ${statement.period}\n` +
            `ยอดเรียกเก็บ: ฿${statement.totalAmount.toLocaleString()}\n` +
            `VAT: ฿${statement.vat.toLocaleString()}\n\n` +
            `ดูรายละเอียดได้ที่หน้า "Statements"`
        );

        // Send notification to LINE Notify (if enabled)
        if (settings.adsLineNotifyToken) {
          await sendLineNotify(
            settings.adsLineNotifyToken,
            `📄 รับสเตทเมนต์ Ads ใหม่\n\n` +
              `รอบบิล: ${statement.period}\n` +
              `ยอดเรียกเก็บ: ฿${statement.totalAmount.toLocaleString()}\n` +
              `VAT: ฿${statement.vat.toLocaleString()}\n` +
              `วันที่: ${new Date().toLocaleDateString("th-TH")}`
          );
        }
      }

      // Handle text message (help/info)
      if (event.type === "message" && event.message.type === "text") {
        const text = event.message.text.trim().toLowerCase();
        const replyToken = event.replyToken;

        if (!settings.adsLineChannelAccessToken) {
          continue;
        }

        if (
          text.includes("help") ||
          text.includes("ช่วย") ||
          text.includes("วิธี")
        ) {
          await replyMessage(
            replyToken,
            settings.adsLineChannelAccessToken,
            `📋 วิธีใช้งาน:\n\n` +
              `1. ดาวน์โหลดสเตทเมนต์ (PDF) จาก Meta Business Suite\n` +
              `2. ส่งไฟล์ PDF เข้ากลุ่มนี้\n` +
              `3. ระบบจะอ่านและบันทึกข้อมูลอัตโนมัติ\n\n` +
              `⚠️ กรุณาส่งไฟล์ PDF สเตทเมนต์จาก Meta Ads เท่านั้น`
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE Ads webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "LINE Ads webhook ready (for Statements)",
    endpoint: "/api/webhooks/line-ads",
  });
}
