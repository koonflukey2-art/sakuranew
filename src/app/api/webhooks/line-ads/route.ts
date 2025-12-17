// app/api/webhooks/line-ads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { processStatementPDF } from "@/lib/line-ads-integration";

export const runtime = "nodejs";

function log(...args: any[]) {
  console.log("[LINE-ADS WEBHOOK]", ...args);
}

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
    if (!replyToken || !channelAccessToken) {
      log("replyMessage: missing replyToken or channelAccessToken");
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
      const txt = await response.text();
      log("replyMessage FAILED:", response.status, txt);
      return false;
    }

    log("replyMessage OK");
    return true;
  } catch (error) {
    log("replyMessage error:", error);
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
    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    log("downloadLineFile from:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
      },
    });

    if (!response.ok) {
      const txt = await response.text();
      log("downloadLineFile FAILED:", response.status, txt);
      return null;
    }

    const contentDisposition = response.headers.get("content-disposition");
    const fileNameMatch = contentDisposition?.match(/filename="?(.+?)"?$/);
    const fileName = fileNameMatch
      ? fileNameMatch[1]
      : `statement-${messageId}.pdf`;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    log(
      "downloadLineFile OK, name=",
      fileName,
      "size=",
      buffer.length,
      "bytes"
    );
    return { buffer, fileName };
  } catch (error) {
    log("downloadLineFile error:", error);
    return null;
  }
}

/**
 * Send LINE Notify message (เฉพาะ Ads)
 */
async function sendLineNotify(token: string, message: string): Promise<boolean> {
  try {
    if (!token) {
      log("sendLineNotify: missing token");
      return false;
    }

    const response = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: new URLSearchParams({ message }),
    });

    if (!response.ok) {
      const txt = await response.text();
      log("sendLineNotify FAILED:", response.status, txt);
      return false;
    }

    log("sendLineNotify OK");
    return true;
  } catch (error) {
    log("sendLineNotify error:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  let rawBody = "";

  try {
    rawBody = await request.text();
    const signature = request.headers.get("x-line-signature") || "";

    log("========== NEW REQUEST ==========");
    log("raw body:", rawBody);
    log("signature:", signature);

    // ดึง systemSettings ที่มีค่า Ads LINE ตั้งค่าไว้
    const settings = await prisma.systemSettings.findFirst({
      where: {
        adsLineChannelSecret: { not: null },
      },
    });

    if (!settings) {
      log("!! No systemSettings with adsLineChannelSecret found");
      return NextResponse.json(
        { error: "LINE Ads not configured" },
        { status: 500 }
      );
    }

    log("settings:", {
      organizationId: settings.organizationId,
      hasAdsLineChannelSecret: !!settings.adsLineChannelSecret,
      hasAdsLineChannelAccessToken: !!settings.adsLineChannelAccessToken,
      hasAdsLineNotifyToken: !!settings.adsLineNotifyToken,
    });

    if (!settings.adsLineChannelSecret) {
      log("!! adsLineChannelSecret is empty");
      return NextResponse.json(
        { error: "LINE Ads secret not configured" },
        { status: 500 }
      );
    }

    // ตรวจ signature
    const isValid = verifySignature(
      rawBody,
      signature,
      settings.adsLineChannelSecret
    );
    log("signature valid:", isValid);

    if (!isValid) {
      // ระหว่าง debug เราไม่ต้องการให้ LINE retry บ่อย ๆ → ตอบ 200 แต่ log ไว้
      log("!! INVALID SIGNATURE (but returning 200 for debug)");
      return NextResponse.json(
        { ok: false, reason: "invalid signature" },
        { status: 200 }
      );
    }

    const data = JSON.parse(rawBody);
    const events = data.events || [];
    log("events length:", events.length);

    for (const event of events) {
      log("event type:", event.type);

      // ---------- HANDLE FILE (PDF) ----------
      if (event.type === "message" && event.message?.type === "file") {
        const messageId: string = event.message.id;
        const replyToken: string = event.replyToken;
        const originalFileName: string =
          event.message.fileName || "statement.pdf";

        log("FILE EVENT:", {
          messageId,
          originalFileName,
        });

        if (!settings.adsLineChannelAccessToken) {
          log("!! adsLineChannelAccessToken not configured");
          continue;
        }

        // 1) โหลดไฟล์จาก LINE
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

        // 2) Process PDF → ดึง period / amount / vat
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
              "กรุณาตรวจสอบว่าเป็นไฟล์ PDF จาก Meta Ads และมีข้อมูลยอดเงินครบถ้วน"
          );
          continue;
        }

        log("statementData:", statementData);

        // 3) บันทึกลง DB
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

        log("DB INSERT OK, id:", statement.id);

        // 4) ตอบกลับในห้อง LINE
        await replyMessage(
          replyToken,
          settings.adsLineChannelAccessToken,
          `✅ รับสเตทเมนต์แล้ว!\n\n` +
            `รอบบิล: ${statement.period}\n` +
            `ยอดเรียกเก็บ: ฿${statement.totalAmount.toLocaleString()}\n` +
            `VAT: ฿${statement.vat.toLocaleString()}\n\n` +
            `ดูรายละเอียดได้ที่หน้า "Facebook Ads Statements" ในระบบเว็บค่ะ`
        );

        // 5) ส่ง LINE Notify ถ้าตั้งค่าไว้
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

      // ---------- HANDLE TEXT (help / info) ----------
      if (event.type === "message" && event.message?.type === "text") {
        const text: string = event.message.text?.trim().toLowerCase() ?? "";
        const replyToken: string = event.replyToken;

        log("TEXT EVENT:", text);

        if (!settings.adsLineChannelAccessToken) continue;

        if (
          text.includes("help") ||
          text.includes("ช่วย") ||
          text.includes("วิธี")
        ) {
          await replyMessage(
            replyToken,
            settings.adsLineChannelAccessToken,
            `📋 วิธีใช้งานสเตทเมนต์ Ads:\n\n` +
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
    console.error("❌ LINE Ads webhook error:", error);
    console.error("Raw body:", rawBody);
    // ตอบ 200 เพื่อไม่ให้ LINE retry รัว ๆ ระหว่าง debug
    return NextResponse.json(
      { error: error?.message || "webhook error" },
      { status: 200 }
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
