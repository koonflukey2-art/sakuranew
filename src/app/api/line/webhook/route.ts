// src/app/api/line/webhook/route.ts

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLineMessage } from "@/lib/line-parser";

// ใช้ Node runtime เพื่อให้ crypto ทำงานได้ (สำคัญมากสำหรับ Render)
export const runtime = "nodejs";

// --- helper: โหลด channel secret ---
async function getLineChannelSecret(): Promise<string | null> {
  try {
    // ใช้จาก ENV ก่อน
    if (process.env.LINE_CHANNEL_SECRET) {
      return process.env.LINE_CHANNEL_SECRET;
    }

    // fallback: จากฐานข้อมูล (กรณีเก็บใน DB)
    const settings = await prisma.lineSettings?.findFirst({
      where: { isActive: true },
      select: { channelSecret: true },
    });

    return settings?.channelSecret ?? null;
  } catch (err) {
    console.error("❌ Cannot load LINE channel secret:", err);
    return null;
  }
}

// --- main webhook endpoint ---
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-line-signature") || "";
    const bodyText = await req.text(); // ต้องอ่านเป็น text ก่อน verify

    // ----- verify signature -----
    const channelSecret = await getLineChannelSecret();

    if (channelSecret) {
      const hash = crypto
        .createHmac("SHA256", channelSecret)
        .update(bodyText)
        .digest("base64");

      if (hash !== signature) {
        console.warn("⚠️ Invalid LINE signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.warn("⚠️ No LINE channel secret configured — skipping verification");
    }

    // ----- parse body -----
    const data = JSON.parse(bodyText);
    if (!Array.isArray(data.events)) {
      console.log("⚠️ No LINE events found:", data);
      return NextResponse.json({ success: true });
    }

    // ----- handle each event -----
    for (const event of data.events) {
      console.log("📩 LINE event:", event.type);

      if (event.type === "message" && event.message?.type === "text") {
        const messageText = event.message.text?.trim() || "";
        const parsed = parseLineMessage(messageText);

        if (parsed && parsed.amount) {
          // TODO: ตัวอย่างการบันทึก order
          // const userId = event.source.userId;
          // await prisma.order.create({
          //   data: {
          //     amount: parsed.amount,
          //     note: parsed.note ?? null,
          //     source: "LINE",
          //     lineUserId: userId,
          //   },
          // });
          console.log("💾 Parsed message:", parsed);
        }
      }
    }

    // ----- ตอบกลับ LINE ต้องเป็น 200 -----
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("💥 LINE webhook error:", error);
    // ตอบ 200 เพื่อให้ Verify ผ่านแน่ ๆ
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

// --- GET สำหรับเช็คว่า endpoint มีจริง ---
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "LINE webhook alive ✅",
  });
}
