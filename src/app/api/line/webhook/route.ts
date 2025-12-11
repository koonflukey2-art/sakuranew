import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLineMessage } from "@/lib/line-parser";
import {
  getLineSettings,
  replyLineMessage,
  sendLineNotify,
  formatOrderConfirmation,
  checkAndNotifyLowStock,
} from "@/lib/line-integration";

export const runtime = "nodejs";

// โหลด SystemSettings ที่มี organization และใช้เป็นแหล่ง LINE settings หลัก
async function getActiveSystemSettings() {
  const settings = await prisma.systemSettings.findFirst({
    where: {
      organizationId: { not: null },
    },
  });

  if (!settings) {
    console.warn("⚠️ No systemSettings row found – you must save settings at least once from System Settings page");
    return null;
  }

  if (!settings.lineChannelAccessToken && !settings.lineNotifyToken) {
    console.warn("⚠️ SystemSettings found but no LINE tokens configured yet");
  }

  return settings;
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
      // ต้องตอบ 200 กลับไปหา LINE เสมอ
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    console.log("🔥 LINE WEBHOOK - NEW REQUEST");

    if (!Array.isArray(data.events) || data.events.length === 0) {
      console.log("⚠️ No events in webhook payload");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // ดึง settings จาก systemSettings (ของ organization แรกที่มีในระบบ)
    const activeSystemSettings = await getActiveSystemSettings();
    const organizationId = activeSystemSettings?.organizationId || null;

    if (!organizationId) {
      console.warn("⚠️ No organizationId on systemSettings – skip saving orders");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    console.log(`✅ Organization ID: ${organizationId}`);

    // ดึง LINE settings (token + flags) จาก SystemSettings (ผ่าน helper)
    const systemSettings = await getLineSettings(organizationId);
    // systemSettings อันนี้จะมีประมาณ:
    // {
    //   lineNotifyToken,
    //   lineChannelAccessToken,
    //   lineChannelSecret,
    //   lineWebhookUrl,
    //   notifyOnOrder,
    //   notifyOnLowStock
    // }

    // loop ทุก event
    for (const event of data.events) {
      if (event.type !== "message" || event.message?.type !== "text") continue;

      const text: string = event.message.text?.trim() ?? "";
      const replyToken = event.replyToken;

      if (!text) continue;

      console.log("───────────────────────────────────────────");
      console.log("📨 Processing event type: message");
      console.log("💬 Message text:", text);

      // ข้ามข้อความสรุปยอด (กัน parse ผิด)
      if (text.includes("ยอดตามทั้งหมด") || text.includes("จำนวนออเดอร์")) {
        console.log("📊 Summary message detected - skipping order creation");
        continue;
      }

      // 1) แปลงข้อความเป็นออเดอร์
      const parsed = parseLineMessage(text);

      if (!parsed) {
        console.log("🚫 Failed to parse message, skipping.");

        // ถ้า parse ไม่ได้ → ส่งข้อความช่วยเหลือกลับ
        if (systemSettings?.lineChannelAccessToken && replyToken) {
          await replyLineMessage(
            replyToken,
            systemSettings.lineChannelAccessToken,
            "รูปแบบข้อความไม่ถูกต้อง\n\nตัวอย่างที่ถูกต้อง:\n1 5 100\n(ประเภท จำนวน ราคา)"
          );
        }

        continue;
      }

      console.log("📦 Parsed result:", JSON.stringify(parsed, null, 2));

      // ต้องมี amount และ productType
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

      // 2) จัดการ Customer
      console.log("\n👤 Processing customer...");
      const phone = parsed.phone?.trim() || "";
      const name = parsed.customerName?.trim() || "ลูกค้าไม่ระบุชื่อ";
      const address = parsed.address?.trim() || "";

      console.log(`  Phone: ${phone}`);
      console.log(`  Name: ${name}`);
      console.log(`  Address: ${address}`);

      let customer = phone
        ? await prisma.customer.findFirst({
            where: { organizationId, phone },
          })
        : null;

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name,
            phone: phone || "UNKNOWN",
            address: address || null,
            organizationId,
          },
        });
        console.log(`  ✅ Customer created: ${customer.id}`);
      } else {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            name: customer.name === "ลูกค้าไม่ระบุชื่อ" ? name : customer.name,
            address: address || customer.address,
          },
        });
        console.log(`  ✅ Customer found: ${customer.id}`);
        console.log(`  ✅ Customer updated`);
      }

      // 3) หา ProductType
      console.log("\n📦 Creating order...");
      console.log(`  Product Type: ${parsed.productType}`);
      console.log(`  Quantity: ${parsed.quantity}`);
      console.log(`  Total Amount: ${parsed.amount}`);

      const productType = await prisma.productType.findFirst({
        where: {
          organizationId,
          typeNumber: parsed.productType,
          isActive: true,
        },
      });

      if (!productType) {
        console.log(
          `⚠️ Product type ${parsed.productType} not found for organization ${organizationId}`
        );

        if (systemSettings?.lineChannelAccessToken && replyToken) {
          await replyLineMessage(
            replyToken,
            systemSettings.lineChannelAccessToken,
            `ไม่พบประเภทสินค้าหมายเลข ${parsed.productType} ในระบบ`
          );
        }

        continue;
      }

      // 4) สร้าง Order
      const order = await prisma.order.create({
        data: {
          amount: parsed.amount,
          quantity: parsed.quantity,
          productType: parsed.productType,
          productName: parsed.productName ?? productType.typeName ?? null,
          rawMessage: text,
          status: "CONFIRMED",
          customerId: customer.id,
          organizationId,
        },
      });

      console.log(`✅ Order created successfully: ${order.id}`);

      // 5) ตัดสต็อก
      const product = await prisma.product.findFirst({
        where: {
          organizationId,
          productType: parsed.productType,
        },
      });

      if (product) {
        const updatedProduct = await prisma.product.update({
          where: { id: product.id },
          data: {
            quantity: {
              decrement: parsed.quantity,
            },
          },
        });

        console.log(
          `📉 Stock updated for product ${product.id} (-${parsed.quantity})`
        );

        // 6) เช็คและแจ้งเตือนสต็อกต่ำ (ใช้ LINE Notify ถ้าตั้งค่าไว้)
        await checkAndNotifyLowStock(updatedProduct, systemSettings || {});
      } else {
        console.log(
          `⚠️ Product type ${parsed.productType} not found in stock system - skipping stock decrement`
        );
      }

      // 7) ส่งข้อความยืนยันกลับหาลูกค้า (ใช้ Channel Access Token)
      if (systemSettings?.lineChannelAccessToken && replyToken) {
        const confirmationMessage = formatOrderConfirmation(order);
        await replyLineMessage(
          replyToken,
          systemSettings.lineChannelAccessToken,
          confirmationMessage
        );
      }

      // 8) ส่ง LINE Notify ให้แอดมิน (ถ้ามีตั้งค่า token และเปิด notifyOnOrder)
      if (systemSettings?.notifyOnOrder && systemSettings?.lineNotifyToken) {
        const notifyMessage =
          `🔔 ออเดอร์ใหม่!\n` +
          `\n` +
          `📦 เลขที่: ${order.id.slice(0, 8).toUpperCase()}\n` +
          `🛍️ สินค้า: ${
            order.productName || `หมายเลข ${order.productType}`
          }\n` +
          `📊 จำนวน: ${order.quantity} ชิ้น\n` +
          `💰 ยอดเงิน: ฿${order.amount.toLocaleString()}\n` +
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
    console.error("❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌");

    // ตอบ 200 ให้ LINE เสมอ เพื่อไม่ให้ Webhook พัง
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
