// src/app/api/webhooks/line-ads/route.ts
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

    if (!response.ok) {
      console.error(
        "LINE reply error status:",
        response.status,
        await response.text()
      );
    }

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
    console.log("📥 Downloading LINE file:", messageId);

    const response = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      {
        headers: {
          Authorization: `Bearer ${channelAccessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(
        "Download LINE file error status:",
        response.status,
        await response.text()
      );
      return null;
    }

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

    if (!response.ok) {
      console.error(
        "LINE Notify error status:",
        response.status,
        await response.text()
      );
    }

    return response.ok;
  } catch (error) {
    console.error("LINE Notify error:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1) อ่าน raw body สำหรับตรวจลายเซ็น
    const body = await request.text();
    const signature = request.headers.get("x-line-signature");

    console.log("🔥 LINE ADS WEBHOOK HIT");

    if (!signature) {
      console.error("❌ Missing x-line-signature");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // 2) ดึง SystemSettings ที่มี Ads config
    const settings = await prisma.systemSettings.findFirst({
      where: {
        adsLineChannelSecret: { not: null },
      },
    });

    if (!settings?.adsLineChannelSecret) {
      console.error("❌ LINE Ads Channel Secret not configured");
      return NextResponse.json(
        { error: "LINE Ads not configured" },
        { status: 500 }
      );
    }

    if (!settings.organizationId) {
      console.error("❌ systemSettings.organizationId is NULL (LINE Ads)");
      return NextResponse.json(
        { error: "No organizationId in SystemSettings" },
        { status: 500 }
      );
    }

    // 3) ตรวจลายเซ็น
    const isValid = verifySignature(
      body,
      signature,
      settings.adsLineChannelSecret
    );

    if (!isValid) {
      console.error("❌ Invalid LINE Ads signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // 4) แปลง JSON
    const data = JSON.parse(body);
    const events = data.events || [];

    console.log("📨 LINE Ads events:", events.length);

    for (const event of events) {
      console.log("➡️ Event type:", event.type, "message.type:", event.message?.type);

      // ---------- รับไฟล์ PDF ----------
      if (event.type === "message" && event.message.type === "file") {
        const messageId = event.message.id;
        const replyToken = event.replyToken;
        const originalFileName = event.message.fileName || "statement.pdf";

        if (!settings.adsLineChannelAccessToken) {
          console.error("❌ LINE Ads Channel Access Token not configured");
          continue;
        }

        console.log("📄 Received file from LINE:", originalFileName);

        // 4.1 ดาวน์โหลดไฟล์จาก LINE
        const fileData = await downloadLineFile(
          messageId,
          settings.adsLineChannelAccessToken
        );

        if (!fileData) {
          console.error("❌ Cannot download file from LINE");
          await replyMessage(
            replyToken,
            settings.adsLineChannelAccessToken,
            "❌ ไม่สามารถดาวน์โหลดไฟล์ได้"
          );
          continue;
        }

        // 4.2 ประมวลผล PDF → ดึง period, total, vat
        const statementData = await processStatementPDF(
          fileData.buffer,
          originalFileName,
          settings.organizationId
        );

        if (!statementData) {
          console.error("❌ processStatementPDF() return null");
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

        console.log("📌 Parsed statement:", statementData);

        // 4.3 สร้าง record ใน DB (กันซ้ำด้วย fileHash)
        let statement;
        try {
          statement = await prisma.facebookAdsStatement.create({
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
        } catch (err: any) {
          console.error("❌ Prisma facebookAdsStatement.create error:", err);

          await replyMessage(
            replyToken,
            settings.adsLineChannelAccessToken,
            "❌ บันทึกสเตทเมนต์ลงระบบไม่สำเร็จ\n" +
              (err?.message || "")
          );
          continue;
        }

        console.log("✅ LINE Ads: statement saved:", statement.id);

        // 4.4 ตอบกลับใน LINE
        await replyMessage(
          replyToken,
          settings.adsLineChannelAccessToken,
          `✅ รับสเตทเมนต์แล้ว!\n\n` +
            `รอบบิล: ${statement.period}\n` +
            `ยอดเรียกเก็บ: ฿${statement.totalAmount.toLocaleString()}\n` +
            `VAT: ฿${statement.vat.toLocaleString()}\n\n` +
            `ดูรายละเอียดได้ที่หน้า "Facebook Ads Statements"`
        );

        // 4.5 แจ้งเตือนผ่าน LINE Notify ถ้ามี token
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

      // ---------- ข้อความ help ----------
      if (event.type === "message" && event.message.type === "text") {
        const text = (event.message.text || "").trim().toLowerCase();
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
            `📋 วิธีใช้งาน LINE Ads Statements:\n\n` +
              `1. ดาวน์โหลดสเตทเมนต์ (PDF) จาก Meta Business Suite\n` +
              `2. ส่งไฟล์ PDF เข้าห้องนี้\n` +
              `3. ระบบจะอ่านและบันทึกข้อมูลอัตโนมัติ\n\n` +
              `⚠️ กรุณาส่งไฟล์ PDF สเตทเมนต์จาก Meta Ads เท่านั้น`
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ LINE Ads webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook error" },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "LINE Ads webhook ready (for Statements)",
    endpoint: "/api/webhooks/line-ads",
  });
}
