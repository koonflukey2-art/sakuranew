import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { processReceiptImage } from "@/lib/line-ads-integration";

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
 * Download image from LINE
 */
async function downloadLineImage(
  messageId: string,
  channelAccessToken: string
): Promise<Buffer | null> {
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

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Download LINE image error:", error);
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
      // Handle image message (receipt)
      if (event.type === "message" && event.message.type === "image") {
        const messageId = event.message.id;
        const replyToken = event.replyToken;

        if (!settings.adsLineChannelAccessToken) {
          console.error("LINE Ads Channel Access Token not configured");
          continue;
        }

        // Download image
        const imageBuffer = await downloadLineImage(
          messageId,
          settings.adsLineChannelAccessToken
        );

        if (!imageBuffer) {
          await replyMessage(
            replyToken,
            settings.adsLineChannelAccessToken,
            "❌ ไม่สามารถดาวน์โหลดรูปภาพได้"
          );
          continue;
        }

        // Process receipt image with high-accuracy extraction
        const receiptData = await processReceiptImage(
          imageBuffer,
          settings.organizationId
        );

        if (!receiptData) {
          await replyMessage(
            replyToken,
            settings.adsLineChannelAccessToken,
            "❌ ไม่สามารถอ่านข้อมูลจากสลิปได้\n\n" +
              "กรุณาตรวจสอบ:\n" +
              "• รูปภาพชัดเจน ไม่มัว\n" +
              "• มี QR Code หรือข้อความจำนวนเงินชัดเจน\n" +
              "• แสงสว่างเพียงพอ"
          );
          continue;
        }

        // Warn if confidence is low
        if (receiptData.confidence < 0.7) {
          await replyMessage(
            replyToken,
            settings.adsLineChannelAccessToken,
            `⚠️ อ่านข้อมูลได้แต่ความแม่นยำต่ำ\n\n` +
              `วิธีการ: ${receiptData.extractionMethod === "QR_EMV" ? "QR Code" : "OCR"}\n` +
              `ความมั่นใจ: ${(receiptData.confidence * 100).toFixed(0)}%\n` +
              `จำนวนเงิน: ฿${receiptData.amount.toLocaleString()}\n\n` +
              `⚠️ กรุณาตรวจสอบความถูกต้อง\n` +
              `หากผิดพลาด ลองถ่ายรูปใหม่ให้ชัดขึ้น`
          );
          continue;
        }

        // Determine payment method
        const paymentMethod = receiptData.qrData ? "QR_CODE" : "BANK_TRANSFER";

        // Create receipt record
        const receipt = await prisma.adReceipt.create({
          data: {
            organizationId: settings.organizationId,
            receiptNumber: receiptData.receiptNumber,
            platform: "META_ADS",
            paymentMethod,
            amount: receiptData.amount,
            currency: "THB",
            receiptUrl: receiptData.imageUrl,
            qrCodeData: receiptData.qrData || null,
            isProcessed: false,
            paidAt: receiptData.metadata?.date
              ? new Date(receiptData.metadata.date)
              : new Date(),
            notes: `Method: ${receiptData.extractionMethod}, Confidence: ${(receiptData.confidence * 100).toFixed(1)}%` +
              (receiptData.metadata?.refNumber ? `, Ref: ${receiptData.metadata.refNumber}` : ""),
          },
        });

        // Build success message with accuracy details
        const methodLabel =
          receiptData.extractionMethod === "QR_EMV" ? "QR Code (แม่นยำสูง)" :
          receiptData.extractionMethod === "OCR" ? "OCR (อ่านข้อความ)" :
          "Manual";

        const confidenceEmoji =
          receiptData.confidence >= 0.95 ? "🎯" :
          receiptData.confidence >= 0.85 ? "✅" :
          "⚠️";

        // Send success reply
        await replyMessage(
          replyToken,
          settings.adsLineChannelAccessToken,
          `${confidenceEmoji} รับสลิปแล้ว!\n\n` +
            `เลขที่: ${receipt.receiptNumber}\n` +
            `จำนวนเงิน: ฿${receipt.amount.toLocaleString()}\n` +
            `แพลตฟอร์ม: ${receipt.platform}\n` +
            `วิธีการอ่าน: ${methodLabel}\n` +
            `ความแม่นยำ: ${(receiptData.confidence * 100).toFixed(0)}%\n` +
            (receiptData.metadata?.date ? `วันที่: ${receiptData.metadata.date}\n` : "") +
            (receiptData.metadata?.refNumber ? `อ้างอิง: ${receiptData.metadata.refNumber}\n` : "") +
            `\nดูรายละเอียดเพิ่มเติมได้ที่หน้า "อัพโหลดสลิป"`
        );

        // Send notification to LINE Notify (if enabled)
        if (settings.adsLineNotifyToken) {
          await sendLineNotify(
            settings.adsLineNotifyToken,
            `🧾 รับสลิปโฆษณาใหม่\n\n` +
              `เลขที่: ${receipt.receiptNumber}\n` +
              `จำนวน: ฿${receipt.amount.toLocaleString()}\n` +
              `วิธีการ: ${methodLabel}\n` +
              `ความแม่นยำ: ${(receiptData.confidence * 100).toFixed(0)}%\n` +
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

        if (text.includes("help") || text.includes("ช่วย") || text.includes("วิธี")) {
          await replyMessage(
            replyToken,
            settings.adsLineChannelAccessToken,
            `📋 วิธีใช้งานระบบอ่านสลิป:\n\n` +
              `1. ถ่ายรูปสลิปจากการจ่ายเงินโฆษณา\n` +
              `   (Meta Ads/Facebook Ads/Google Ads)\n\n` +
              `2. ส่งรูปเข้ากลุ่มนี้\n\n` +
              `3. ระบบจะอ่านข้อมูลอัตโนมัติ 2 วิธี:\n` +
              `   🎯 QR Code (ความแม่นยำ 99%+)\n` +
              `   📄 OCR อ่านข้อความ (ความแม่นยำ 90%+)\n\n` +
              `4. ข้อมูลถูกบันทึกในระบบทันที\n\n` +
              `💡 เคล็ดลับ:\n` +
              `• ถ่ายรูปให้ชัดเจน ไม่มัว\n` +
              `• แสงสว่างเพียงพอ\n` +
              `• ให้เห็น QR Code และจำนวนเงินชัดเจน\n` +
              `• ระบบรองรับภาษาไทย + อังกฤษ`
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
    message: "LINE Ads webhook ready",
    endpoint: "/api/webhooks/line-ads",
  });
}
