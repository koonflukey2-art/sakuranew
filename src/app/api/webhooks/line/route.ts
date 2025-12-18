import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyLineSignature,
  parseLineOrderMessage,
  replyLineMessage,
  sendLineNotify,
} from "@/lib/line-integration";
import { getDailySequence, resetDailySequenceIfNeeded } from "@/lib/daily-counter";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-line-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    const settings = await prisma.systemSettings.findFirst({
      where: {
        lineChannelSecret: { not: null },
      },
    });

    if (!settings?.lineChannelSecret) {
      console.error("LINE Channel Secret not configured");
      return NextResponse.json(
        { error: "LINE not configured" },
        { status: 500 }
      );
    }

    const isValid = verifyLineSignature(
      body,
      signature,
      settings.lineChannelSecret
    );

    if (!isValid) {
      console.error("Invalid LINE signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const data = JSON.parse(body);
    const events = data.events || [];

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const messageText = event.message.text;
        const replyToken = event.replyToken;

        const orderData = parseLineOrderMessage(messageText);

        if (!orderData) {
          if (settings.lineChannelAccessToken) {
            await replyLineMessage(
              replyToken,
              settings.lineChannelAccessToken,
              "รูปแบบไม่ถูกต้อง\nใช้: [ประเภทสินค้า] [จำนวน] [ราคา]\nตัวอย่าง: 1 5 100"
            );
          }
          continue;
        }

        // ✅ VALIDATE PRODUCT EXISTS BEFORE CREATING ORDER
        const product = await prisma.product.findFirst({
          where: {
            organizationId: settings.organizationId,
            productType: orderData.productType,
          },
        });

        if (!product) {
          if (settings.lineChannelAccessToken) {
            await replyLineMessage(
              replyToken,
              settings.lineChannelAccessToken,
              `❌ ไม่พบสินค้าประเภท ${orderData.productType}\n\n` +
                `กรุณาสร้างสินค้าประเภทนี้ในระบบก่อน\n` +
                `หรือตรวจสอบหมายเลขประเภทสินค้า`
            );
          }
          continue;
        }

        // ✅ CHECK STOCK AVAILABILITY
        if (product.quantity < orderData.quantity) {
          if (settings.lineChannelAccessToken) {
            await replyLineMessage(
              replyToken,
              settings.lineChannelAccessToken,
              `❌ สต็อกไม่พอ!\n\n` +
                `สินค้า: ${product.name}\n` +
                `สต็อกคงเหลือ: ${product.quantity} ชิ้น\n` +
                `ต้องการ: ${orderData.quantity} ชิ้น`
            );
          }
          continue;
        }

        // Check if need to reset daily counter
        await resetDailySequenceIfNeeded(settings.organizationId);

        // Get next daily sequence number
        const dailySequence = await getDailySequence(settings.organizationId);

        // Generate order number with date and sequence
        const today = new Date();
        const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
        const orderNumber = `ORD-${dateStr}-${String(dailySequence).padStart(3, "0")}`;

        // Find or create customer (using a default customer for LINE orders)
        let customer = await prisma.customer.findFirst({
          where: {
            organizationId: settings.organizationId,
            phone: "LINE_DEFAULT",
          },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              organizationId: settings.organizationId,
              name: "ลูกค้า LINE",
              phone: "LINE_DEFAULT",
              address: "จาก LINE",
            },
          });
        }

        // Create order
        const order = await prisma.order.create({
          data: {
            organizationId: settings.organizationId,
            orderNumber,
            dailySequence,
            productType: orderData.productType,
            productName: product.name, // ✅ Store product name
            quantity: orderData.quantity,
            amount: orderData.amount,
            unitPrice: orderData.amount / orderData.quantity,
            source: "LINE",
            status: "PENDING",
            customerId: customer.id,
            orderDate: new Date(),
          },
        });

        // Update product stock
        await prisma.product.update({
          where: { id: product.id },
          data: {
            quantity: {
              decrement: orderData.quantity,
            },
          },
        });

        // ✅ Reply with product name
        if (settings.lineChannelAccessToken) {
          await replyLineMessage(
            replyToken,
            settings.lineChannelAccessToken,
            `✅ รับออเดอร์แล้ว!\n\n` +
              `📋 รายการที่ ${dailySequence} (วันนี้)\n` +
              `เลขที่: ${order.orderNumber}\n` +
              `สินค้า: ${product.name}\n` +
              `ประเภท: ${orderData.productType}\n` +
              `จำนวน: ${orderData.quantity} ชิ้น\n` +
              `ราคา: ฿${orderData.amount.toLocaleString()}\n\n` +
              `🕐 รอตัดยอดเวลา ${String(settings.dailyCutOffHour).padStart(2, "0")}:${String(settings.dailyCutOffMinute).padStart(2, "0")} น.`
          );
        }

        // ✅ Send notification with product name
        if (settings.notifyOnOrder && settings.lineNotifyToken) {
          await sendLineNotify(
            settings.lineNotifyToken,
            `🔔 ออเดอร์ใหม่ - รายการที่ ${dailySequence}\n\n` +
              `เลขที่: ${order.orderNumber}\n` +
              `สินค้า: ${product.name}\n` +
              `ประเภท: ${orderData.productType}\n` +
              `จำนวน: ${orderData.quantity} ชิ้น\n` +
              `ราคา: ฿${orderData.amount.toLocaleString()}`
          );
        }

        // Check low stock
        if (product && product.quantity < product.minStockLevel) {
          if (settings.notifyOnLowStock && settings.lineNotifyToken) {
            await sendLineNotify(
              settings.lineNotifyToken,
              `⚠️ สต็อกต่ำ!\n` +
                `สินค้า: ${product.name}\n` +
                `เหลือ: ${product.quantity} ชิ้น`
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: "ok", message: "LINE webhook ready" });
}
