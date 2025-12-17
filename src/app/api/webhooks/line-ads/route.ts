// src/app/api/webhooks/line-ads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processStatementPDF } from "@/lib/line-ads-integration";
import crypto from "crypto";

export const runtime = "nodejs";

// ---------------------- helpers ----------------------

/**
 * Verify LINE webhook signature
 */
function verifySignature(
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
    console.error("❌ verifySignature error:", error);
    return false;
  }
}

/**
 * Reply text message to LINE
 */
async function replyMessage(opts: {
  replyToken: string;
  channelAccessToken: string;
  text: string;
}): Promise<boolean> {
  const { replyToken, channelAccessToken, text } = opts;

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text }],
      }),
    });

    if (!res.ok) {
      console.error("❌ LINE reply failed:", res.status, await res.text());
      return false;
    }

    console.log("✅ LINE reply sent");
    return true;
  } catch (error) {
    console.error("❌ LINE reply error:", error);
    return false;
  }
}

/**
 * LINE Notify
 */
async function sendLineNotify(token: string, message: string): Promise<boolean> {
  try {
    const res = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: new URLSearchParams({ message }),
    });

    if (!res.ok) {
      console.error("❌ LINE Notify failed:", res.status, await res.text());
      return false;
    }

    console.log("✅ LINE Notify sent");
    return true;
  } catch (error) {
    console.error("❌ LINE Notify error:", error);
    return false;
  }
}

/**
 * Download file (PDF) from LINE Messaging API
 */
async function downloadLineFile(opts: {
  messageId: string;
  channelAccessToken: string;
}): Promise<{ buffer: Buffer; fileName: string } | null> {
  const { messageId, channelAccessToken } = opts;

  try {
    const res = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${channelAccessToken}`,
        },
      }
    );

    if (!res.ok) {
      console.error(
        "❌ downloadLineFile failed:",
        res.status,
        await res.text()
      );
      return null;
    }

    const contentDisposition = res.headers.get("content-disposition");
    const fileNameMatch = contentDisposition?.match(/filename="?(.+?)"?$/i);
    const fileName =
      fileNameMatch?.[1] ?? `statement-${messageId}.pdf`.replace(/"+/g, "");

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(
      `✅ Downloaded LINE file: ${fileName} (${buffer.length} bytes)`
    );

    return { buffer, fileName };
  } catch (error) {
    console.error("❌ downloadLineFile error:", error);
    return null;
  }
}

// ---------------------- MAIN HANDLERS ----------------------

export async function POST(request: NextRequest) {
  let rawBody = "";

  try {
    rawBody = await request.text();
    const signature = request.headers.get("x-line-signature");

    console.log("===== LINE-ADS WEBHOOK POST =====");
    console.log("↪ rawBody length:", rawBody.length);
    console.log("↪ signature:", signature ? "present" : "missing");

    if (!signature) {
      console.error("❌ Missing x-line-signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // โหลด Ads LINE settings จาก SystemSettings
    const settings = await prisma.systemSettings.findFirst({
      where: {
        adsLineChannelSecret: { not: null },
      },
    });

    if (!settings?.adsLineChannelSecret || !settings.adsLineChannelAccessToken) {
      console.error(
        "❌ LINE Ads settings not configured (adsLineChannelSecret / adsLineChannelAccessToken)"
      );
      // ต้องตอบ 200 กลับไป ไม่งั้น LINE จะ retry
      return NextResponse.json(
        { error: "LINE Ads not configured" },
        { status: 200 }
      );
    }

    // Verify signature
    const valid = verifySignature(
      rawBody,
      signature,
      settings.adsLineChannelSecret
    );

    if (!valid) {
      console.error("❌ Invalid LINE Ads signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);
    const events: any[] = Array.isArray(payload.events) ? payload.events : [];

    console.log("↪ events count:", events.length);

    if (events.length === 0) {
      return NextResponse.json({ success: true });
    }

    for (const event of events) {
      const eventType = event.type;
      const messageType = event.message?.type;
      console.log(
        `📨 Event: type=${eventType}, messageType=${messageType}, id=${event.message?.id}`
      );

      // --------------------------------------------------
      // 1) FILE MESSAGE = PDF STATEMENT
      // --------------------------------------------------
      if (eventType === "message" && messageType === "file") {
        const messageId: string = event.message.id;
        const replyToken: string = event.replyToken;
        const originalFileName: string =
          event.message.fileName || "statement.pdf";

        console.log("📄 Handling statement file:", originalFileName);

        // ดาวน์โหลดไฟล์ PDF จาก LINE
        const fileData = await downloadLineFile({
          messageId,
          channelAccessToken: settings.adsLineChannelAccessToken,
        });

        if (!fileData) {
          await replyMessage({
            replyToken,
            channelAccessToken: settings.adsLineChannelAccessToken,
            text: "❌ ไม่สามารถดาวน์โหลดไฟล์ได้\nกรุณาลองใหม่อีกครั้ง",
          });
          continue;
        }

        // ประมวลผล PDF → ดึง period, amount, vat + fileHash
        const statementMeta = await processStatementPDF(
          fileData.buffer,
          originalFileName,
          settings.organizationId
        );

        if (!statementMeta) {
          await replyMessage({
            replyToken,
            channelAccessToken: settings.adsLineChannelAccessToken,
            text:
              "❌ ไม่สามารถอ่านข้อมูลจากสเตทเมนต์ได้\n\n" +
              "กรุณาตรวจสอบว่าเป็นไฟล์ PDF จาก Meta Ads และลองส่งใหม่อีกครั้ง",
          });
          continue;
        }

        // 🔁 เช็คว่าไฟล์นี้ (fileHash) เคยบันทึกแล้วหรือยัง
        const duplicate = await prisma.facebookAdsStatement.findFirst({
          where: {
            organizationId: settings.organizationId,
            fileHash: statementMeta.fileHash,
          },
        });

        if (duplicate) {
          console.warn(
            `⚠️ Duplicate statement from LINE. messageId=${messageId}, existingId=${duplicate.id}`
          );

          await replyMessage({
            replyToken,
            channelAccessToken: settings.adsLineChannelAccessToken,
            text:
              "⚠️ ไฟล์สเตทเมนต์นี้ถูกบันทึกไว้แล้วในระบบ\n\n" +
              `รอบบิลเดิม: ${duplicate.period}\n` +
              `ยอดเรียกเก็บ: ฿${duplicate.totalAmount.toLocaleString(
                "th-TH"
              )}`,
          });

          if (settings.adsLineNotifyToken) {
            await sendLineNotify(
              settings.adsLineNotifyToken,
              `⚠️ มีการส่งสเตทเมนต์ซ้ำจาก LINE\n\n` +
                `รอบบิล: ${duplicate.period}\n` +
                `ยอดเรียกเก็บ: ฿${duplicate.totalAmount.toLocaleString(
                  "th-TH"
                )}`
            );
          }

          continue;
        }

        // บันทึกลงฐานข้อมูล
        try {
          const statement = await prisma.facebookAdsStatement.create({
            data: {
              organizationId: settings.organizationId,
              period: statementMeta.period,
              startDate: statementMeta.startDate,
              endDate: statementMeta.endDate,
              totalAmount: statementMeta.totalAmount,
              vat: statementMeta.vat,
              fileUrl: statementMeta.fileUrl,
              fileName: statementMeta.fileName,
              fileHash: statementMeta.fileHash,
              source: "LINE",
              lineMessageId: messageId,
              isProcessed: false,
            },
          });

          console.log(
            `✅ Saved FacebookAdsStatement: ${statement.id} / ${statement.period}`
          );

          // ตอบกลับในห้อง LINE
          await replyMessage({
            replyToken,
            channelAccessToken: settings.adsLineChannelAccessToken,
            text:
              "✅ รับสเตทเมนต์เรียบร้อยแล้ว!\n\n" +
              `รอบบิล: ${statement.period}\n` +
              `ยอดเรียกเก็บ (รวม VAT): ฿${statement.totalAmount.toLocaleString(
                "th-TH"
              )}\n` +
              `VAT: ฿${statement.vat.toLocaleString("th-TH")}\n\n` +
              `สามารถตรวจสอบได้ที่หน้า Facebook Ads Statements ในระบบเว็บ`,
          });

          // ยิง LINE Notify ถ้ามี token
          if (settings.adsLineNotifyToken) {
            await sendLineNotify(
              settings.adsLineNotifyToken,
              `📄 รับสเตทเมนต์โฆษณาใหม่\n\n` +
                `รอบบิล: ${statement.period}\n` +
                `ยอดเรียกเก็บ: ฿${statement.totalAmount.toLocaleString(
                  "th-TH"
                )}\n` +
                `VAT: ฿${statement.vat.toLocaleString("th-TH")}\n` +
                `วันที่: ${new Date().toLocaleDateString("th-TH")}`
            );
          }
        } catch (err: any) {
          console.error("❌ Error saving FacebookAdsStatement:", err);

          if (err?.code === "P2002") {
            await replyMessage({
              replyToken,
              channelAccessToken: settings.adsLineChannelAccessToken,
              text:
                "⚠️ ไฟล์นี้เคยถูกบันทึกไว้แล้วในระบบ\n" +
                "ไม่ต้องส่งซ้ำอีกนะคะ 🙂",
            });
          } else {
            await replyMessage({
              replyToken,
              channelAccessToken: settings.adsLineChannelAccessToken,
              text:
                "❌ เกิดข้อผิดพลาดขณะบันทึกสเตทเมนต์ในระบบ\n" +
                "โปรดลองใหม่อีกครั้ง หรือแจ้งผู้ดูแลระบบ",
            });
          }
        }

        continue;
      }

      // --------------------------------------------------
      // 2) TEXT MESSAGE = HELP / HOW-TO
      // --------------------------------------------------
      if (eventType === "message" && messageType === "text") {
        const text: string = event.message.text?.trim().toLowerCase() ?? "";
        const replyToken: string = event.replyToken;

        if (!text) continue;

        console.log("💬 LINE Ads text message:", text);

        if (
          text.includes("help") ||
          text.includes("วิธี") ||
          text.includes("สเตทเมนต์") ||
          text.includes("statement")
        ) {
          await replyMessage({
            replyToken,
            channelAccessToken: settings.adsLineChannelAccessToken,
            text:
              "📋 วิธีส่งสเตทเมนต์ค่าโฆษณา Meta Ads\n\n" +
              "1. ดาวน์โหลดไฟล์สเตทเมนต์ (PDF) จาก Meta Business Suite\n" +
              "2. ส่งไฟล์ PDF นี้เข้าห้องแชทที่เชื่อมกับบอท\n" +
              "3. ระบบจะอ่านรอบบิล ยอดเรียกเก็บ และ VAT ให้อัตโนมัติ\n\n" +
              "จากนั้นสามารถดูสรุปทั้งหมดได้ในหน้า \"Facebook Ads Statements\" บนเว็บ",
          });
        } else {
          console.log("ℹ️ Non-help text – ignored");
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ LINE Ads webhook error:", error);
    console.error("rawBody:", rawBody.slice(0, 500)); // กัน log ยาวเกิน

    // ต้องตอบ 200 ให้ LINE เสมอ ไม่งั้นจะ retry ถี่
    return NextResponse.json(
      { error: error?.message || "Webhook error" },
      { status: 200 }
    );
  }
}

// สำหรับทดสอบจาก browser / curl
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    ok: true,
    message: "LINE Ads TEST webhook ready",
    endpoint: "/api/webhooks/line-ads",
    time: new Date().toISOString(),
  });
}
