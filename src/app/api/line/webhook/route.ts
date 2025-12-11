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

/**
 * ✅ ใช้ SystemSettings แถวแรกในการหา organizationId
 * หมายเหตุ: ถ้ามีหลายองค์กร ในอนาคตค่อยเปลี่ยน mapping ตาม LINE destination / channel id ได้
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

  return {
    organizationId: settings.organizationId,
  };
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
      // ต้องตอบ 200 ให้ LINE เสมอ ไม่งั้น LINE จะ retry รัว ๆ
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    console.log("🔥 LINE WEBHOOK - NEW REQUEST");

    if (!Array.isArray(data.events) || data.events.length === 0) {
      console.log("⚠️ No events in webhook payload");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // ✅ ดึง orgId จาก SystemSettings แถวแรก
    const activeOrg = await getActiveOrganizationFromSystemSettings();
    const organizationId = activeOrg?.organizationId;

    if (!organizationId) {
      console.warn(
        "⚠️ No organizationId from SystemSettings – skip saving orders (แต่ยังตอบ 200 ให้ LINE)"
      );
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    console.log(`✅ Using Organization ID: ${organizationId}`);

    // 📥 ดึง config LINE (token / flags) จาก SystemSettings ผ่าน helper
    const systemSettings = await getLineSettings(organizationId);
    // systemSettings จะหน้าตาประมาณ:
    // {
    //   lineNotifyToken,
    //   lineChannelAccessToken,
    //   lineChannelSecret,
    //   lineWebhookUrl,
    //   notifyOnOrder,
    //   notifyOnLowStock,
    //   notifyDailySummary?
    // }

    // 🔁 loop ทุก event
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

      // 1) แปลงข้อความจาก LINE → โครงสร้างออเดอร์
      const parsed = parseLineMessage(text);

      if (!parsed) {
        console.log("🚫 Failed to parse message, skipping.");

        // ถ้า parse ไม่ได้ → ส่งข้อความช่วยลูกค้าหน่อย
        if (systemSettings?.lineChannelAccessToken && replyToken) {
          await replyLineMessage(
            replyToken,
            systemSettings.lineChannelAccessToken,
            "รูปแบบข้อความไม่ถูกต้อง\n\nตัวอย่างที่ถูกต้อง:\n1\nยอดเก็บ 390\n\nชื่อลูกค้า\nที่อยู่...\nเบอร์โทร\n\n3 (จำนวน)"
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

      // 👉 คำนวณ unitPrice ให้ชัด: ถ้ามีจำนวน > 0 ให้เอา amount / quantity
      const safeQuantity = parsed.quantity && parsed.quantity > 0 ? parsed.quantity : 1;
      const unitPrice =
        parsed.unitPrice && parsed.unitPrice > 0
          ? parsed.unitPrice
          : parsed.amount / safeQuantity;

      // 2) จัดการลูกค้า
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

      // 3) หา ProductType ให้ตรงกับเลขที่ลูกค้าส่งมา
      console.log("\n📦 Creating order...");
      console.log(`  Product Type: ${parsed.productType}`);
      console.log(`  Quantity: ${safeQuantity}`);
      console.log(`  Total Amount: ${parsed.amount}`);
      console.log(`  Unit Price: ${unitPrice}`);

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

      // 4) สร้าง Order ให้ครบ field ตาม schema
      const order = await prisma.order.create({
        data: {
          amount: parsed.amount, // ยอดเก็บรวม
          quantity: safeQuantity,
          unitPrice, // ราคาต่อชิ้น
          productType: parsed.productType,
          productName: parsed.productName ?? productType.typeName ?? null,
          rawMessage: text,
          status: "CONFIRMED", // หรือจะเปลี่ยนเป็น "PENDING" ก็ได้ตามที่ใช้ใน dashboard
          customerId: customer.id,
          organizationId,
          // orderDate: new Date(), // ไม่ใส่ก็ได้ ใช้ default(now())
        },
      });

      console.log(`✅ Order created successfully: ${order.id}`);

      // 5) ตัดสต็อกจาก Product ตาม productType
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
              decrement: safeQuantity,
            },
          },
        });

        console.log(
          `📉 Stock updated for product ${product.id} (-${safeQuantity})`
        );

        // 6) เช็คและแจ้งเตือนสต็อกต่ำ (ใช้ settings.notifyOnLowStock + lineNotifyToken)
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

      // 8) ส่ง LINE Notify ให้แอดมิน (ถ้ามี token + เปิด notifyOnOrder)
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
