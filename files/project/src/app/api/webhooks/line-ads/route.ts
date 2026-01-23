// src/app/api/webhooks/line-ads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const runtime = "nodejs";

// ---------------------- helpers ----------------------

function verifySignature(body: Buffer, signature: string, channelSecret: string): boolean {
  try {
    const hash = crypto
      .createHmac("sha256", channelSecret)
      .update(body)
      .digest("base64");

    const a = Buffer.from(hash);
    const b = Buffer.from((signature || "").trim());
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (error) {
    console.error("❌ verifySignature error:", error);
    return false;
  }
}


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

    return true;
  } catch (error) {
    console.error("❌ LINE reply error:", error);
    return false;
  }
}


async function pushMessage(opts: {
  to: string;
  channelAccessToken: string;
  text: string;
}): Promise<boolean> {
  const { to, channelAccessToken, text } = opts;

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text }],
      }),
    });

    if (!res.ok) {
      console.error("❌ LINE push failed:", res.status, await res.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ LINE push error:", error);
    return false;
  }
}



async function downloadLineFile(opts: {
  messageId: string;
  channelAccessToken: string;
}): Promise<Buffer | null> {
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
      console.error("❌ downloadLineFile failed:", res.status, await res.text());
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("❌ downloadLineFile error:", error);
    return null;
  }
}

// ---------------------- MAIN ----------------------

export async function POST(request: NextRequest) {
  let rawBody = "";
  let rawBuf: Buffer | null = null;

  try {
    rawBuf = Buffer.from(await request.arrayBuffer());
    rawBody = rawBuf.toString("utf8");
    const signature = request.headers.get("x-line-signature") || "";

    console.log("===== LINE-ADS WEBHOOK POST =====");
    console.log("↪ rawBody length:", rawBody.length);
    console.log("↪ signature:", signature ? "present" : "missing");

    if (!signature) {
      console.warn("❌ Missing x-line-signature header");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const settings = await prisma.systemSettings.findFirst({
      where: { adsLineChannelSecret: { not: null } },
      orderBy: { updatedAt: "desc" },
    });

    const pushTo = String((settings as any)?.lineTargetId || "").trim();

    if (!settings?.adsLineChannelSecret || !settings.adsLineChannelAccessToken) {
      console.error("❌ LINE Ads settings not configured");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const valid = rawBuf ? verifySignature(rawBuf, signature, settings.adsLineChannelSecret) : false;
    if (!valid) {
      console.error("❌ Invalid LINE Ads signature");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const payload = JSON.parse(rawBody);
    const events: any[] = Array.isArray(payload.events) ? payload.events : [];

    console.log("↪ events count:", events.length);

    for (const event of events) {
      const eventType = event.type;
      const messageType = event.message?.type;

      // 1) FILE MESSAGE = PDF STATEMENT
      if (eventType === "message" && messageType === "file") {
        const messageId: string = event.message.id;
        const replyToken: string = event.replyToken;
        const originalFileName: string = event.message.fileName || "statement.pdf";

        console.log("📄 Handling statement file:", originalFileName);

        const pdfBuf = await downloadLineFile({
          messageId,
          channelAccessToken: settings.adsLineChannelAccessToken,
        });

        if (!pdfBuf) {
          await replyMessage({
            replyToken,
            channelAccessToken: settings.adsLineChannelAccessToken,
            text: "❌ ไม่สามารถดาวน์โหลดไฟล์ได้\nกรุณาลองใหม่อีกครั้ง",
          });
          continue;
        }

        // IMPORTANT:
        // กัน build-time crash ตอน Next "Collecting page data"
        // โดยเลื่อนการ import โมดูลที่พึ่ง native deps (canvas/pdf) ไปตอน runtime
        const { processStatementPDF } = await import("@/lib/line-ads-integration");

        const meta = await processStatementPDF(
          pdfBuf,
          originalFileName,
          settings.organizationId
        );

        if (!meta) {
          await replyMessage({
            replyToken,
            channelAccessToken: settings.adsLineChannelAccessToken,
            text:
              "❌ ไม่สามารถอ่านข้อมูลจากสเตทเมนต์ได้\n\n" +
              "กรุณาตรวจสอบว่าเป็นไฟล์ PDF จาก Meta Ads และลองส่งใหม่อีกครั้ง",
          });
          continue;
        }

        const duplicate = await prisma.facebookAdsStatement.findFirst({
          where: { organizationId: settings.organizationId, fileHash: meta.fileHash },
        });

        if (duplicate) {
          const dup = duplicate;
          await replyMessage({
            replyToken,
            channelAccessToken: settings.adsLineChannelAccessToken,
            text:
              "⚠️ ไฟล์สเตทเมนต์นี้ถูกบันทึกไว้แล้วในระบบ\n\n" +
              `รอบบิลเดิม: ${duplicate!.period}\n` +
              `ยอดเรียกเก็บ: ฿${duplicate!.totalAmount.toLocaleString("th-TH")}`,
          });
          if (pushTo) {
            await pushMessage({
              to: pushTo,
              channelAccessToken: settings.adsLineChannelAccessToken,
              text:
                `⚠️ มีการส่งสเตทเมนต์ซ้ำ

` +
                `รอบบิล: ${duplicate!.period}
` +
                `ยอดเรียกเก็บ: ฿${duplicate!.totalAmount.toLocaleString("th-TH")}`,
            });
          }
          continue;
        }

        try {
          const statement = await prisma.facebookAdsStatement.create({
            data: {
              organizationId: settings.organizationId,
              period: meta.period,
              startDate: meta.startDate,
              endDate: meta.endDate,
              totalAmount: meta.totalAmount,
              vat: meta.vat,
              fileUrl: meta.fileUrl,
              fileName: meta.fileName,
              fileHash: meta.fileHash,
              source: "LINE",
              lineMessageId: messageId,
              isProcessed: false,
            },
          });

          await replyMessage({
            replyToken,
            channelAccessToken: settings.adsLineChannelAccessToken,
            text:
              "✅ รับสเตทเมนต์เรียบร้อยแล้ว!\n\n" +
              `รอบบิล: ${statement.period}\n` +
              `ยอดเรียกเก็บ (รวม VAT): ฿${statement.totalAmount.toLocaleString("th-TH")}\n` +
              `VAT: ฿${statement.vat.toLocaleString("th-TH")}\n\n` +
              `สามารถตรวจสอบได้ที่หน้า Facebook Ads Statements ในระบบเว็บ`,
          });
          if (pushTo) {
            await pushMessage({
              to: pushTo,
              channelAccessToken: settings.adsLineChannelAccessToken,
              text:
                `⚠️ มีการส่งสเตทเมนต์ซ้ำ

` +
                `รอบบิล: ${duplicate!.period}
` +
                `ยอดเรียกเก็บ: ฿${duplicate!.totalAmount.toLocaleString("th-TH")}`,
            });
          }
        } catch (err: any) {
          console.error("❌ Error saving FacebookAdsStatement:", err);
          await replyMessage({
            replyToken,
            channelAccessToken: settings.adsLineChannelAccessToken,
            text: "❌ เกิดข้อผิดพลาดขณะบันทึกสเตทเมนต์ในระบบ",
          });
        }

        continue;
      }

      // 2) TEXT MESSAGE = HELP
      if (eventType === "message" && messageType === "text") {
        const text: string = event.message.text?.trim().toLowerCase() ?? "";
        const replyToken: string = event.replyToken;

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
              "1) ดาวน์โหลดไฟล์สเตทเมนต์ (PDF)\n" +
              "2) ส่งไฟล์ PDF เข้าห้องนี้\n" +
              "3) ระบบจะอ่านรอบบิล/ยอด/VAT อัตโนมัติ\n\n" +
              "ดูผลได้ที่หน้า Facebook Ads Statements บนเว็บ",
          });
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error("❌ LINE Ads webhook error:", error);
    // ✅ ตอบ 200 เสมอ กัน retry
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "LINE Ads webhook ready",
    time: new Date().toISOString(),
  });
}
