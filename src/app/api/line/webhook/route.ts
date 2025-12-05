// src/app/api/line/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLineMessage, parseSummaryMessage } from "@/lib/line-parser";

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

    console.log("🔥 LINE webhook POST hit");
    console.log("Body:", JSON.stringify(data, null, 2));

    if (!Array.isArray(data.events) || data.events.length === 0) {
      console.log("⚠️ No events in webhook payload");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const settings = await getActiveLineSettings();
    const organizationId = settings?.organizationId;

    if (!organizationId) {
      console.warn("⚠️ No organizationId on active LINE settings – skip saving");
    }

    // loop ทุก event
    for (const event of data.events) {
      if (event.type !== "message" || event.message?.type !== "text") continue;

      const text: string = event.message.text?.trim() ?? "";
      if (!text) continue;

      // ถ้าเป็นข้อความสรุปรายวัน (มีคำว่า "ยอดตามทั้งหมด" อะไรพวกนี้)
      if (text.includes("ยอดตามทั้งหมด") || text.includes("จำนวนออเดอร์")) {
        const summary = parseSummaryMessage(text);
        console.log("📊 Parsed summary:", summary);
        // ตอนนี้ยังไม่มี table summary ก็แค่ log ไว้ก่อน
        continue;
      }

      // ปกติ: แปลงเป็นออเดอร์เดี่ยว
      const parsed = parseLineMessage(text);
      console.log("📦 Parsed order:", parsed);

      if (!parsed || !organizationId) {
        continue;
      }

      // ต้องมียอดเก็บและประเภทสินค้า (1-4)
      if (!parsed.amount || !parsed.productType) {
        console.log("🚫 Missing amount or productType, skip");
        continue;
      }

      // ----- จัดการ Customer -----
      const phone = parsed.phone?.trim() || "";
      const name = parsed.customerName?.trim() || "ลูกค้าไม่ระบุชื่อ";
      const address = parsed.address?.trim() || "";

      // หา customer เดิมจากเบอร์ (ถ้ามี) + org
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
      } else {
        // อัปเดตชื่อ/ที่อยู่ถ้าข้อมูลใหม่ดีกว่าเดิม
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            name: customer.name || name,
            address: customer.address || address || null,
          },
        });
      }

      // ----- ตรวจสอบชื่อประเภทสินค้าจากฐานข้อมูล -----
      let productTypeName: string | null = parsed.productName ?? null;

      if (organizationId && parsed.productType) {
        const productTypeRecord = await prisma.productType.findFirst({
          where: { organizationId, code: parsed.productType },
        });

        if (productTypeRecord?.name) {
          productTypeName = productTypeRecord.name;
        }
      }

      // ----- สร้าง Order -----
      const quantity = parsed.quantity ?? 1;
      const amount = parsed.amount ?? 0;

      const order = await prisma.order.create({
        data: {
          amount,
          unitPrice: parsed.unitPrice ?? null,
          quantity,
          productType: parsed.productType,
          productName: productTypeName,
          rawMessage: text,
          status: "CONFIRMED",
          customerId: customer.id,
          organizationId,
        },
      });

      console.log(
        "Order created:",
        order.id,
        "Type:",
        order.productType,
        "Qty:",
        order.quantity,
        "Amount:",
        order.amount
      );

      // ลด stock อัตโนมัติ + อัปเดตราคาขาย หรือสร้างสินค้าใหม่ถ้าไม่มี
      let product = await prisma.product.findFirst({
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
              decrement: quantity,
            },
            sellPrice:
              parsed.unitPrice && parsed.unitPrice > 0
                ? parsed.unitPrice
                : product.sellPrice,
          },
        });

        console.log("📉 Stock updated for product", product.id, "-", quantity);
      } else {
        product = await prisma.product.create({
          data: {
            name: productTypeName || `สินค้าประเภท ${parsed.productType}`,
            category: "LINE", // default category placeholder
            productType: parsed.productType,
            quantity: 0,
            minStockLevel: 10,
            costPrice: 0,
            sellPrice: parsed.unitPrice && parsed.unitPrice > 0 ? parsed.unitPrice : 0,
            organizationId,
          },
        });

        console.log("🆕 Created product for productType", parsed.productType, product.id);
      }

      console.log(
        `✅ Saved order for org=${organizationId}, customer=${customer.id}`
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("💥 LINE webhook error:", err, "rawBody:", rawBody);
    // ตอบ 200 ให้ LINE เสมอ
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "LINE webhook alive ✅ (orders enabled)",
  });
}
