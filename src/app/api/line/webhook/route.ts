// src/app/api/line/webhook/route.ts

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

    console.log("\n╔═══════════════════════════════════════════╗");
    console.log("║  🔥 LINE WEBHOOK - NEW REQUEST            ║");
    console.log("╚═══════════════════════════════════════════╝");
    console.log("📥 Body:", JSON.stringify(data, null, 2));

    if (!Array.isArray(data.events) || data.events.length === 0) {
      console.log("⚠️ No events in webhook payload");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const settings = await getActiveLineSettings();
    const organizationId = settings?.organizationId;

    if (!organizationId) {
      console.warn("⚠️ No organizationId on active LINE settings – skip saving");
      return NextResponse.json({ ok: false, error: "No organization" }, { status: 400 });
    }

    console.log("✅ Organization ID:", organizationId);

    // loop ทุก event
    for (const event of data.events) {
      console.log("\n───────────────────────────────────────────");
      console.log("📨 Processing event type:", event.type);

      if (event.type !== "message" || event.message?.type !== "text") {
        console.log("⏭️  Skipping non-text event");
        continue;
      }

      const text: string = event.message.text?.trim() ?? "";
      if (!text) {
        console.log("⚠️ Empty message text");
        continue;
      }

      console.log("💬 Message text:", text);

      // แปลงข้อความเป็นออเดอร์
      const parsed = parseLineMessage(text);
      console.log("📦 Parsed result:", JSON.stringify(parsed, null, 2));

      if (!parsed || !organizationId) {
        console.log("❌ Failed to parse or no organization");
        continue;
      }

      // ต้องมีประเภทสินค้า
      if (!parsed.productType) {
        console.log("🚫 Missing productType, skip");
        continue;
      }

      console.log("\n👤 Processing customer...");

      // ----- จัดการ Customer -----
      const phone = parsed.phone?.trim() || "";
      const name = parsed.customerName?.trim() || "ลูกค้าไม่ระบุชื่อ";
      const address = parsed.address?.trim() || "";

      console.log("  Phone:", phone || "N/A");
      console.log("  Name:", name);
      console.log("  Address:", address || "N/A");

      // หา customer เดิมจากเบอร์ (ถ้ามี) + org
      let customer = phone
        ? await prisma.customer.findFirst({
            where: { organizationId, phone },
          })
        : null;

      if (!customer) {
        console.log("  ➕ Creating new customer...");
        customer = await prisma.customer.create({
          data: {
            name,
            phone: phone || "UNKNOWN",
            address: address || null,
            organizationId,
          },
        });
        console.log("  ✅ Customer created:", customer.id);
      } else {
        console.log("  ✅ Customer found:", customer.id);
        // อัปเดตชื่อ/ที่อยู่ถ้าข้อมูลใหม่ดีกว่าเดิม
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            name: name || customer.name,
            address: address || customer.address || null,
          },
        });
        console.log("  ✅ Customer updated");
      }

      console.log("\n📦 Creating order...");

      // ----- สร้าง Order -----
      const quantity = parsed.quantity ?? 1;
      const unitPrice = parsed.unitPrice ?? 0;
      const amount = parsed.amount ?? (unitPrice * quantity);

      console.log("  Product Type:", parsed.productType);
      console.log("  Product Name:", parsed.productName || "N/A");
      console.log("  Quantity:", quantity);
      console.log("  Unit Price:", unitPrice);
      console.log("  Total Amount:", amount);

      const order = await prisma.order.create({
        data: {
          amount,
          unitPrice,
          quantity,
          productType: parsed.productType,
          productName: parsed.productName ?? null,
          rawMessage: text,
          status: "CONFIRMED",
          customerId: customer.id,
          organizationId,
        },
      });

      console.log("✅ Order created:", order.id);
      console.log("  Type:", order.productType);
      console.log("  Qty:", order.quantity);
      console.log("  Unit Price:", order.unitPrice);
      console.log("  Amount:", order.amount);

      console.log("\n📊 Updating product stock...");

      // ลด stock อัตโนมัติถ้าสินค้า match productType
      const product = await prisma.product.findFirst({
        where: {
          organizationId,
          productType: parsed.productType,
        },
      });

      if (product) {
        console.log("  ✅ Product found:", product.id);
        console.log("  Current stock:", product.quantity);
        
        await prisma.product.update({
          where: { id: product.id },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        });

        console.log("  ✅ Stock decreased by", quantity);
        console.log("  New stock:", product.quantity - quantity);
      } else {
        console.log("  ⚠️ No product found for type", parsed.productType);
      }

      console.log("\n✅ Order processing complete!");
      console.log(`   Org: ${organizationId}`);
      console.log(`   Customer: ${customer.id}`);
      console.log(`   Order: ${order.id}`);
    }

    console.log("\n╔═══════════════════════════════════════════╗");
    console.log("║  ✅ WEBHOOK PROCESSING COMPLETE           ║");
    console.log("╚═══════════════════════════════════════════╝\n");

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("\n❌❌❌ LINE WEBHOOK ERROR ❌❌❌");
    console.error("Error:", err);
    console.error("Raw body:", rawBody);
    console.error("❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n");
    
    // ตอบ 200 ให้ LINE เสมอ
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "LINE webhook alive ✅ (orders enabled)",
    timestamp: new Date().toISOString(),
  });
}