// app/api/webhooks/line-ads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processStatementPDF } from "@/lib/line-ads-integration";
import {
  getLineAdsSettings,
  sendLineReply,
  sendLineNotification,
  verifyLineAdsSignature,
} from "@/lib/line-client";

export const runtime = "nodejs";

/**
 * โหลดไฟล์ PDF จาก LINE (Messaging API data endpoint)
 */
async function downloadLineFile(
  messageId: string,
  channelAccessToken: string
): Promise<{ buffer: Buffer; fileName: string } | null> {
  try {
    console.log("⬇️  Downloading LINE file content:", messageId);

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
        "❌ Download LINE file failed:",
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

    console.log("✅ File downloaded size:", buffer.length, "bytes");
    return { buffer, fileName };
  } catch (error) {
    console.error("❌ Download LINE file error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  let rawBody = "";

  try {
    rawBody = await request.text();
    const signature = request.headers.get("x-line-signature") || "";

    console.log("\n================ LINE ADS WEBHOOK ================");
    console.log("📥 Incoming headers x-line-signature:", signature ? "[HAS]" : "[MISSING]");

    // 1) โหลด settings สำหรับ Ads bot (adsLineXXX)
    const settings = await getLineAdsSettings();
    console.log("⚙️  Ads settings:", {
      organizationId: settings.organizationId,
      hasChannelToken: !!settings.channelToken,
      hasChannelSecret: !!settings.channelSecret,
      hasNotifyToken: !!settings.notifyToken,
    });

    if (!settings.channelSecret || !settings.channelToken) {
      console.error("❌ LINE Ads not configured correctly (missing token/secret)");
      // ยังตอบ 200 ให้ LINE เพื่อไม่ให้ retry รัว ๆ
      return NextResponse.json({ error: "LINE Ads not configured" }, { status: 200 });
    }

    // 2) verify signature
    const isValid = await verifyLineAdsSignature(rawBody, signature);
    if (!isValid) {
      console.error("❌ Invalid LINE Ads signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 3) parse payload
    const data = JSON.parse(rawBody);
    const events = Array.isArray(data.events) ? data.events : [];

    if (events.length === 0) {
      console.log("⚠️ No events in LINE Ads payload");
      return NextResponse.json({ success: true });
    }

    const organizationId = settings.organizationId;
    if (!organizationId) {
      console.error("❌ No organizationId in SystemSettings for Ads");
      return NextResponse.json({ error: "No organizationId" }, { status: 200 });
    }

    for (const event of events) {
      console.log("\n---------- NEW EVENT ----------");
      console.log("event.type:", event.type);
      console.log("message.type:", event.message?.type);

      // ==============
      // 📎 รับไฟล์ PDF
      // ==============
      if (event.type === "message" && event.message?.type === "file") {
        const messageId: string = event.message.id;
        const replyToken: string = event.replyToken;
        const originalFileName: string =
          event.message.fileName || "statement.pdf";

        console.log(
          `📎 Received file message: ${originalFileName} (${messageId})`
        );

        // ดาวน์โหลดไฟล์จาก LINE
        const fileData = await downloadLineFile(
          messageId,
          settings.channelToken!
        );

        if (!fileData) {
          await sendLineReply(
            replyToken,
            [{ type: "text", text: "❌ ไม่สามารถดาวน์โหลดไฟล์ได้" }],
            organizationId,
            true // ใช้ Ads bot
          );
          continue;
        }

        // แปลง PDF → ดึงข้อมูลสเตทเมนต์
        const statementData = await processStatementPDF(
          fileData.buffer,
          originalFileName,
          organizationId
        );

        if (!statementData) {
          console.error("❌ processStatementPDF() คืนค่า null");
          await sendLineReply(
            replyToken,
            [
              {
                type: "text",
                text:
                  "❌ ไม่สามารถอ่านข้อมูลจากสเตทเมนต์ได้\n\n" +
                  "กรุณาตรวจสอบ:\n" +
                  "• ไฟล์เป็น PDF จาก Meta Ads\n" +
                  "• ไฟล์ไม่เสียหาย\n" +
                  "• มีข้อมูลรอบบิลและยอดเงิน",
              },
            ],
            organizationId,
            true
          );
          continue;
        }

        console.log("✅ Parsed statement:", statementData);

        // บันทึกลง DB
        const statement = await prisma.facebookAdsStatement.create({
          data: {
            organizationId,
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

        console.log(
          `💾 Saved statement id=${statement.id} period=${statement.period} total=${statement.totalAmount}`
        );

        // ตอบกลับในห้อง LINE
        await sendLineReply(
          replyToken,
          [
            {
              type: "text",
              text:
                `✅ รับสเตทเมนต์แล้ว!\n\n` +
                `รอบบิล: ${statement.period}\n` +
                `ยอดเรียกเก็บ: ฿${statement.totalAmount.toLocaleString(
                  "th-TH"
                )}\n` +
                `VAT: ฿${statement.vat.toLocaleString(
                  "th-TH"
                )}\n\n` +
                `ดูรายละเอียดได้ที่หน้า "Facebook Ads Statements"`,
            },
          ],
          organizationId,
          true
        );

        // แจ้งเตือนผ่าน LINE Notify (ถ้าตั้งค่าไว้)
        if (settings.notifyToken) {
          await sendLineNotification(
            `📄 รับสเตทเมนต์ Ads ใหม่\n\n` +
              `รอบบิล: ${statement.period}\n` +
              `ยอดเรียกเก็บ: ฿${statement.totalAmount.toLocaleString(
                "th-TH"
              )}\n` +
              `VAT: ฿${statement.vat.toLocaleString("th-TH")}\n` +
              `วันที่: ${new Date().toLocaleDateString("th-TH")}`,
            organizationId,
            true
          );
        }

        continue;
      }

      // ====================
      // 💬 ข้อความ text (help)
      // ====================
      if (event.type === "message" && event.message?.type === "text") {
        const text: string = String(event.message.text || "")
          .trim()
          .toLowerCase();
        const replyToken: string = event.replyToken;

        console.log("💬 Text message:", text);

        if (
          text.includes("help") ||
          text.includes("ช่วย") ||
          text.includes("วิธี")
        ) {
          await sendLineReply(
            replyToken,
            [
              {
                type: "text",
                text:
                  `📋 วิธีใช้งาน LINE Ads Statements:\n\n` +
                  `1. ดาวน์โหลดสเตทเมนต์ (PDF) จาก Meta Business Suite\n` +
                  `2. ส่งไฟล์ PDF เข้าห้องนี้\n` +
                  `3. ระบบจะอ่านและบันทึกข้อมูลอัตโนมัติ\n\n` +
                  `⚠️ กรุณาส่งไฟล์ PDF สเตทเมนต์จาก Meta Ads เท่านั้น`,
              },
            ],
            organizationId,
            true
          );
        } else {
          // คำอื่น ๆ ตอบสั้น ๆ ไว้เช็คว่า webhook ทำงาน
          await sendLineReply(
            replyToken,
            [
              {
                type: "text",
                text:
                  "บอท Ads พร้อมใช้งานแล้วครับ 🙌\nส่งไฟล์สเตทเมนต์ PDF เข้ามาได้เลย",
              },
            ],
            organizationId,
            true
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ LINE Ads webhook error:", error);
    console.error("Raw body:", rawBody);
    // ตอบ 200 ให้ LINE เพื่อไม่ให้ retry ถี่เกินไป
    return NextResponse.json(
      { error: error.message || "Webhook error" },
      { status: 200 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "LINE Ads webhook ready (for Statements)",
    endpoint: "/api/webhooks/line-ads",
  });
}
