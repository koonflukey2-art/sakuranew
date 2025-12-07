import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { parseLineMessage, parseSummaryMessage } from "@/lib/line-parser";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  console.log("\n╔═══════════════════════════════════════════╗");
  console.log("║  LINE WEBHOOK - NEW REQUEST               ║");
  console.log("╚═══════════════════════════════════════════╝");
  console.log("⏰ Timestamp:", new Date().toISOString());

  try {
    // Get request body
    const body = await request.text();
    console.log("\n📥 Request body received");
    console.log("Length:", body.length, "bytes");

    // Parse JSON
    let events;
    try {
      const parsed = JSON.parse(body);
      events = parsed.events;
      console.log("✅ JSON parsed successfully");
      console.log("📊 Events count:", events?.length || 0);
      if (events && events.length > 0) {
        console.log("Events:", JSON.stringify(events, null, 2));
      }
    } catch (error) {
      console.error("❌ Failed to parse JSON:", error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Verify LINE signature
    const headersList = await headers();
    const signature = headersList.get("x-line-signature");
    console.log("\n🔐 Signature verification");
    console.log("  Signature:", signature ? "Present" : "Missing");

    // Get LINE settings
    console.log("\n⚙️  Fetching LINE settings...");
    const lineSettings = await prisma.lINESettings.findFirst({
      where: { isActive: true },
      include: { organization: true },
    });

    if (!lineSettings) {
      console.log("❌ No active LINE settings found");
      return NextResponse.json(
        { error: "LINE not configured" },
        { status: 400 }
      );
    }

    console.log("✅ LINE settings found");
    console.log("  Organization ID:", lineSettings.organizationId);
    console.log("  Organization Name:", lineSettings.organization?.name || "N/A");
    console.log("  Channel Secret:", lineSettings.channelSecret ? "Set" : "Not set");

    // Verify signature if channel secret exists
    if (lineSettings.channelSecret && signature) {
      const hash = crypto
        .createHmac("sha256", lineSettings.channelSecret)
        .update(body)
        .digest("base64");

      if (hash !== signature) {
        console.log("❌ Signature verification failed");
        console.log("  Expected:", hash);
        console.log("  Received:", signature);
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
      console.log("✅ Signature verified");
    } else {
      console.log("⚠️  Skipping signature verification (no secret or signature)");
    }

    // Process events
    if (!events || events.length === 0) {
      console.log("⚠️  No events to process");
      return NextResponse.json({ message: "No events" });
    }

    console.log("\n🔄 Processing events...");
    const organizationId = lineSettings.organizationId;

    for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
      const event = events[eventIndex];

      console.log("\n═══════════════════════════════════════════");
      console.log(`📨 Event ${eventIndex + 1} of ${events.length}`);
      console.log("═══════════════════════════════════════════");
      console.log("Event type:", event.type);
      console.log("Message type:", event.message?.type || "N/A");

      // Only process text messages
      if (event.type !== "message" || event.message?.type !== "text") {
        console.log("⏭️  Skipping non-text event");
        continue;
      }

      const message = event.message.text;
      console.log("\n💬 Message text:");
      console.log("───────────────────────────────────────────");
      console.log(message);
      console.log("───────────────────────────────────────────");

      // Check if it's a summary message
      if (message.includes("ยอดตามทั้งหมด") || message.includes("จำนวนออเดอร์")) {
        console.log("\n📊 Detected summary message");
        const summary = parseSummaryMessage(message);
        console.log("Parsed summary:", summary);
        console.log("⏭️  Skipping summary message (not implemented yet)");
        continue;
      }

      // Parse order message
      console.log("\n🔍 Parsing as order message...");
      const parsed = parseLineMessage(message);

      if (!parsed) {
        console.log("❌ Failed to parse message - skipping");
        continue;
      }

      console.log("\n✅ Message parsed successfully!");
      console.log("───────────────────────────────────────────");
      console.log("Product Type:", parsed.productType);
      console.log("Product Name:", parsed.productName);
      console.log("Customer Name:", parsed.customerName);
      console.log("Phone:", parsed.phone);
      console.log("Address:", parsed.address);
      console.log("Unit Price:", parsed.unitPrice);
      console.log("Quantity:", parsed.quantity);
      console.log("Total Amount:", parsed.amount);
      console.log("───────────────────────────────────────────");

      // Validate parsed data
      if (!parsed.amount || !parsed.productType) {
        console.log("❌ Missing required fields (amount or productType)");
        console.log("  amount:", parsed.amount);
        console.log("  productType:", parsed.productType);
        continue;
      }

      // Find or create customer
      console.log("\n👤 Finding/Creating customer...");
      const phone = parsed.phone.trim();
      const name = parsed.customerName.trim() || "ลูกค้าไม่ระบุชื่อ";
      const address = parsed.address.trim() || "";

      let customer = await prisma.customer.findFirst({
        where: {
          phone: phone,
          organizationId: organizationId,
        },
      });

      if (!customer) {
        console.log("  ➕ Creating new customer");
        customer = await prisma.customer.create({
          data: {
            name: name,
            phone: phone,
            address: address || null,
            organizationId: organizationId,
          },
        });
        console.log("  ✅ Customer created");
        console.log("    ID:", customer.id);
        console.log("    Name:", customer.name);
        console.log("    Phone:", customer.phone);
      } else {
        console.log("  ✅ Customer found");
        console.log("    ID:", customer.id);
        console.log("    Name:", customer.name);

        // Update customer info
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            name: name,
            address: address || customer.address,
          },
        });
        console.log("  ✅ Customer info updated");
      }

      // Create order
      console.log("\n📦 Creating order...");
      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          productType: parsed.productType,
          productName: parsed.productName,
          amount: parsed.amount,
          unitPrice: parsed.unitPrice,
          quantity: parsed.quantity,
          rawMessage: message,
          organizationId: organizationId,
          status: "CONFIRMED",
        },
      });

      console.log("✅ Order created successfully!");
      console.log("  Order ID:", order.id);
      console.log("  Customer ID:", order.customerId);
      console.log("  Product Type:", order.productType);
      console.log("  Product Name:", order.productName);
      console.log("  Unit Price: ฿", order.unitPrice.toLocaleString());
      console.log("  Quantity:", order.quantity);
      console.log("  Total Amount: ฿", order.amount.toLocaleString());
      console.log("  Status:", order.status);

      // Update or create product stock
      console.log("\n📊 Updating product stock...");
      let product = await prisma.product.findFirst({
        where: {
          organizationId: organizationId,
          productType: parsed.productType,
        },
      });

      if (product) {
        console.log("  ✅ Product found");
        console.log("    Product ID:", product.id);
        console.log("    Product Name:", product.name);
        console.log("    Current Stock:", product.quantity);
        console.log("    Decreasing by:", parsed.quantity);

        await prisma.product.update({
          where: { id: product.id },
          data: {
            quantity: { decrement: parsed.quantity },
          },
        });

        const newStock = product.quantity - parsed.quantity;
        console.log("    New Stock:", newStock);

        if (newStock < product.minStockLevel) {
          console.log("    ⚠️  LOW STOCK WARNING!");
          console.log("    Min Stock Level:", product.minStockLevel);
        }
      } else {
        console.log("  ➕ Creating new product");
        product = await prisma.product.create({
          data: {
            name: parsed.productName,
            productType: parsed.productType,
            category: "Other",
            quantity: 0,
            minStockLevel: 10,
            costPrice: 0,
            organizationId: organizationId,
          },
        });
        console.log("  ✅ Product created");
        console.log("    Product ID:", product.id);
        console.log("    Product Name:", product.name);
        console.log("    Note: Stock is 0 - please update cost price and stock");
      }

      console.log("\n✅ Event processed successfully!");
      console.log("═══════════════════════════════════════════");
    }

    console.log("\n╔═══════════════════════════════════════════╗");
    console.log("║  WEBHOOK PROCESSING COMPLETE              ║");
    console.log("╚═══════════════════════════════════════════╝");
    console.log("⏰ Completed at:", new Date().toISOString());
    console.log("\n");

    return NextResponse.json({ success: true, processed: events.length });
  } catch (error: any) {
    console.error("\n❌❌❌ WEBHOOK ERROR ❌❌❌");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n");

    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  console.log("💡 LINE Webhook GET request");
  return NextResponse.json({
    message: "LINE Webhook endpoint is active",
    timestamp: new Date().toISOString(),
    status: "ready",
  });
}
