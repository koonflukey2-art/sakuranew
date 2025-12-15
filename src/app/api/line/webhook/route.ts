import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLineMessage } from "@/lib/line-parser";
import {
  getLineSettings,
  replyLineMessage,
  sendLineNotify,
  formatOrderConfirmation,
  checkAndNotifyLowStock,
  pushLineMessage,
} from "@/lib/line-integration";

export const runtime = "nodejs";

/**
 * ✅ ใช้ SystemSettings แถวแรกในการหา organizationId
 */
async function getActiveOrganizationFromSystemSettings() {
  const settings = await prisma.systemSettings.findFirst();

  if (!settings) {
    console.warn(
      "⚠️ No systemSettings found – กรุณาเข้าไปหน้า System Settings แล้วกดบันทึกอย่างน้อย 1 ครั้ง"
    );
    return null;
  }

  if (!settings.organizationId) {
    console.warn(
      "⚠️ systemSettings.organizationId is null – ตรวจสอบ schema / ข้อมูลในตาราง SystemSettings"
    );
    return null;
  }

  console.log("✅ Loaded SystemSettings for org:", settings.organizationId);

  return { organizationId: settings.organizationId };
}

/**
 * ✅ เลือก targetId จาก source (priority: group > room > user)
 */
function pickTargetIdFromSource(source: any): string | null {
  if (!source) return null;
  if (source.type === "group" && source.groupId) return source.groupId;
  if (source.type === "room" && source.roomId) return source.roomId;
  if (source.type === "user" && source.userId) return source.userId;
  return null;
}

function buildUnknownPhone() {
  return `UNKNOWN-${Date.now()}`;
}

export async function POST(req: NextRequest) {
  let rawBody = "";

  try {
    rawBody = await req.text();

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch (e) {
      console.error("❌ Invalid JSON from LINE webhook:", e);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    console.log("🔥 LINE WEBHOOK - NEW REQUEST");

    if (!Array.isArray(data.events) || data.events.length === 0) {
      console.log("⚠️ No events in webhook payload");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const activeOrg = await getActiveOrganizationFromSystemSettings();
    const organizationId = activeOrg?.organizationId;

    if (!organizationId) {
      console.warn(
        "⚠️ No organizationId from SystemSettings – skip saving orders (แต่ยังตอบ 200 ให้ LINE)"
      );
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    console.log(`✅ Using Organization ID: ${organizationId}`);

    // 📥 ดึง config LINE (token / flags)
    const systemSettings = await getLineSettings(organizationId);

    for (const event of data.events) {
      if (event.type !== "message" || event.message?.type !== "text") continue;

      const text: string = event.message.text?.trim() ?? "";
      const replyToken = event.replyToken;

      if (!text) continue;

      console.log("───────────────────────────────────────────");
      console.log("📨 Processing event type: message");
      console.log("💬 Message text:", text);

      const detectedTargetId = pickTargetIdFromSource(event.source);

      // ==========================================================
      // ✅ คำสั่ง #bind
      // ==========================================================
      if (text.toLowerCase().startsWith("#bind")) {
        if (!detectedTargetId) {
          if (systemSettings?.lineChannelAccessToken && replyToken) {
            await replyLineMessage(
              replyToken,
              systemSettings.lineChannelAccessToken,
              "❌ bind ไม่ได้ เพราะไม่พบ targetId จาก event.source"
            );
          }
          continue;
        }

        await prisma.systemSettings.update({
          where: { organizationId },
          data: {
            lineTargetId: detectedTargetId,
            notifyDailySummary: true,
          },
        });

        const okMsg =
          `✅ ผูกปลายทางสรุปยอดเรียบร้อย\n` +
          `type: ${event.source?.type}\n` +
          `targetId: ${detectedTargetId}\n\n` +
          `ต่อไปกด “ตัดยอดทันที” แล้วสรุปจะถูกส่งมาที่นี่`;

        if (systemSettings?.lineChannelAccessToken && replyToken) {
          await replyLineMessage(
            replyToken,
            systemSettings.lineChannelAccessToken,
            okMsg
          );
        } else if (systemSettings?.lineChannelAccessToken) {
          await pushLineMessage(
            detectedTargetId,
            systemSettings.lineChannelAccessToken,
            okMsg
          );
        }

        continue;
      }

      // ข้ามข้อความสรุปยอด
      if (text.includes("ยอดตามทั้งหมด") || text.includes("จำนวนออเดอร์")) {
        console.log("📊 Summary message detected - skipping order creation");
        continue;
      }

      // 1) แปลงข้อความจาก LINE
      const parsed = parseLineMessage(text);

      if (!parsed) {
        console.log("🚫 Failed to parse message, skipping.");

        if (systemSettings?.lineChannelAccessToken && replyToken) {
          await replyLineMessage(
            replyToken,
            systemSettings.lineChannelAccessToken,
            "รูปแบบข้อความไม่ถูกต้อง\n\nตัวอย่างที่ถูกต้อง:\n1\nยอดเก็บ 390\n\nชื่อลูกค้า ที่อยู่... 062-xxx-xxxx\n\n3"
          );
        }

        continue;
      }

      console.log("📦 Parsed result:", JSON.stringify(parsed, null, 2));

      if (!parsed.amount || !parsed.productType) {
        console.log("🚫 Missing amount or productType, skip");

        if (systemSettings?.lineChannelAccessToken && replyToken) {
          await replyLineMessage(
            replyToken,
            systemSettings.lineChannelAccessToken,
            "ข้อมูลไม่ครบถ้วน กรุณาระบุประเภทสินค้าและยอดเงิน"
          );
        }
        continue;
      }

      const safeQuantity = parsed.quantity && parsed.quantity > 0 ? parsed.quantity : 1;
      const unitPrice =
        parsed.unitPrice && parsed.unitPrice > 0 ? parsed.unitPrice : parsed.amount / safeQuantity;

      // 2) ลูกค้า
      const name = parsed.customerName?.trim() || "ลูกค้าไม่ระบุชื่อ";
      const address = parsed.address?.trim() || "";

      // ✅ ใช้เฉพาะเบอร์ที่เป็น “เลขจริง”
      const phoneDigits = (parsed.phone || "").replace(/\D/g, "");
      const hasRealPhone = phoneDigits.startsWith("0") && (phoneDigits.length === 9 || phoneDigits.length === 10);
      const phoneToSave = hasRealPhone ? phoneDigits : buildUnknownPhone();

      let customer = hasRealPhone
        ? await prisma.customer.findFirst({ where: { organizationId, phone: phoneDigits } })
        : null;

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name,
            phone: phoneToSave,
            address: address || null,
            organizationId,
          },
        });
      } else {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            name: customer.name === "ลูกค้าไม่ระบุชื่อ" ? name : customer.name,
            address: address || customer.address,
          },
        });
      }

      // 3) productType
      const productType = await prisma.productType.findFirst({
        where: {
          organizationId,
          typeNumber: parsed.productType,
          isActive: true,
        },
      });

      if (!productType) {
        if (systemSettings?.lineChannelAccessToken && replyToken) {
          await replyLineMessage(
            replyToken,
            systemSettings.lineChannelAccessToken,
            `ไม่พบประเภทสินค้าหมายเลข ${parsed.productType} ในระบบ`
          );
        }
        continue;
      }

      // 4) create order
      const order = await prisma.order.create({
        data: {
          amount: parsed.amount,
          quantity: safeQuantity,
          unitPrice,
          productType: parsed.productType,
          productName: parsed.productName ?? productType.typeName ?? null,
          rawMessage: text,
          status: "COMPLETED",
          customerId: customer.id,
          organizationId,
        },
      });

      // 5) stock decrement + low stock notify
      const product = await prisma.product.findFirst({
        where: { organizationId, productType: parsed.productType },
      });

      if (product) {
        const updatedProduct = await prisma.product.update({
          where: { id: product.id },
          data: { quantity: { decrement: safeQuantity } },
        });

        await checkAndNotifyLowStock(updatedProduct, systemSettings || {});
      }

      // 6) reply confirmation
      if (systemSettings?.lineChannelAccessToken && replyToken) {
        const confirmationMessage = formatOrderConfirmation(order as any);
        await replyLineMessage(
          replyToken,
          systemSettings.lineChannelAccessToken,
          confirmationMessage
        );
      }

      // 7) notify admin
      if (systemSettings?.notifyOnOrder && systemSettings?.lineNotifyToken) {
        const notifyMessage =
          `🔔 ออเดอร์ใหม่!\n\n` +
          `📦 เลขที่: ${order.id.slice(0, 8).toUpperCase()}\n` +
          `🛍️ สินค้า: ${order.productName || `หมายเลข ${order.productType}`}\n` +
          `📊 จำนวน: ${order.quantity} ชิ้น\n` +
          `💰 ยอดเงิน: ฿${order.amount.toLocaleString("th-TH")}\n` +
          `👤 ลูกค้า: ${customer.name}\n` +
          `📱 เบอร์: ${customer.phone}`;

        await sendLineNotify(systemSettings.lineNotifyToken, notifyMessage);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("\n❌❌❌ LINE WEBHOOK ERROR ❌❌❌");
    console.error("Error:", err);
    console.error("Raw body:", rawBody);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
