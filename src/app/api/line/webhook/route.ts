import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLineMessage } from "@/lib/line-parser";

export const runtime = "nodejs";

// โหลด LINE settings ที่ active เพื่อหา organization
async function getActiveLineSettings() {
  const settings = await prisma.lINESettings.findFirst({
    where: { isActive: true },
    include: { organization: true },
  });

  if (!settings) {
    console.warn("⚠️ No active LINE settings found");
  }

  return settings;
}

export async function POST(req: NextRequest) {
  let rawBody = "";

  try {
    rawBody = await req.text();
    const data = JSON.parse(rawBody);

    console.log("🔥 LINE WEBHOOK - NEW REQUEST");
    // console.log("Body:", JSON.stringify(data, null, 2));

    if (!Array.isArray(data.events) || data.events.length === 0) {
      console.log("⚠️ No events in webhook payload");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const settings = await getActiveLineSettings();
    const organizationId = settings?.organizationId;

    if (!organizationId) {
      console.warn("⚠️ No organizationId on active LINE settings – skip saving");
      // ถึงไม่มี Org ก็ต้องตอบ 200 กลับไปหา LINE
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    console.log(`✅ Organization ID: ${organizationId}`);

    // loop ทุก event
    for (const event of data.events) {
      if (event.type !== "message" || event.message?.type !== "text") continue;

      const text: string = event.message.text?.trim() ?? "";
      if (!text) continue;

      console.log("───────────────────────────────────────────");
      console.log("📨 Processing event type: message");
      console.log("💬 Message text:", text);

      // ถ้าเป็นข้อความสรุปรายวัน (ข้ามไปก่อน)
      if (text.includes("ยอดตามทั้งหมด") || text.includes("จำนวนออเดอร์")) {
        console.log("📊 Summary message detected - skipping order creation");
        continue;
      }

      // 1. แปลงข้อความเป็นข้อมูล (ใช้ฟังก์ชันใหม่ที่แก้แล้ว)
      const parsed = parseLineMessage(text);

      if (!parsed) {
         console.log("🚫 Failed to parse message, skipping.");
         continue;
      }

      console.log("📦 Parsed result:", JSON.stringify(parsed, null, 2));

      // ต้องมียอดเก็บและประเภทสินค้า
      if (!parsed.amount || !parsed.productType) {
        console.log("🚫 Missing amount or productType, skip");
        continue;
      }

      // 2. จัดการ Customer (ลูกค้า)
      console.log("\n👤 Processing customer...");
      const phone = parsed.phone?.trim() || "";
      const name = parsed.customerName?.trim() || "ลูกค้าไม่ระบุชื่อ";
      const address = parsed.address?.trim() || "";

      console.log(`  Phone: ${phone}`);
      console.log(`  Name: ${name}`);
      console.log(`  Address: ${address}`);

      // หา customer เดิมจากเบอร์ + org
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
        // อัปเดตชื่อ/ที่อยู่ถ้าข้อมูลใหม่ดีกว่าเดิม
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            name: customer.name === "ลูกค้าไม่ระบุชื่อ" ? name : customer.name, // ถ้าของเดิมไม่มีชื่อ ให้ใช้ชื่อใหม่
            address: address || customer.address, // ถ้ามีที่อยู่ใหม่ ให้ทับของเดิม (หรือจะแก้ logic ตามต้องการ)
          },
        });
        console.log(`  ✅ Customer found: ${customer.id}`);
        console.log(`  ✅ Customer updated`);
      }

      // 3. สร้าง Order (บันทึกลงฐานข้อมูล)
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
        console.log(`⚠️ Product type ${parsed.productType} not found for organization ${organizationId}`);
        continue;
      }

      const order = await prisma.order.create({
        data: {
          amount: parsed.amount,       // ยอดเงินรวม (Quantity * UnitPrice)
          quantity: parsed.quantity,   // จำนวนสินค้า
          productType: parsed.productType,
          productName: parsed.productName ?? productType.typeName ?? null,
          rawMessage: text,
          status: "CONFIRMED",
          customerId: customer.id,
          organizationId,
          // ⚠️ IMPORTANT: เอา unitPrice ออก เพราะใน Database ไม่มี column นี้
          // unitPrice: parsed.unitPrice, <--- สาเหตุที่ Error คือบรรทัดนี้
        },
      });

      console.log(`✅ Order created successfully: ${order.id}`);

      // 4. ตัด Stock
      const product = await prisma.product.findFirst({
        where: {
          organizationId,
          productType: parsed.productType,
        },
      });

      if (product) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            quantity: {
              decrement: parsed.quantity,
            },
          },
        });
        console.log(`📉 Stock updated for product ${product.id} (-${parsed.quantity})`);
      } else {
         console.log(`⚠️ Product type ${parsed.productType} not found in stock system - skipping stock decrement`);
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