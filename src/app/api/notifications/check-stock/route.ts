import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    console.log("🔍 Checking for low stock alerts...");

    const alerts = { sent: 0, products: [] as string[], organizations: [] as string[] };

    // Get all organizations
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    for (const org of orgs) {
      // Get low stock products for this organization
      const lowStockProducts = await prisma.product.findMany({
        where: {
          organizationId: org.id,
          quantity: {
            lte: prisma.product.fields.minStockLevel,
          },
        },
        select: {
          name: true,
          quantity: true,
          minStockLevel: true,
        },
      });

      if (lowStockProducts.length === 0) {
        console.log(`ℹ️ No low stock products for org: ${org.name}`);
        continue;
      }

      // Get LINE token for this organization
      const lineCred = await prisma.platformCredential.findFirst({
        where: {
          organizationId: org.id,
          platform: "LINE_NOTIFY",
        },
      });

      if (!lineCred || !lineCred.accessToken) {
        console.log(`⚠️ No LINE token for org: ${org.name}`);
        continue;
      }

      // Format message
      const productList = lowStockProducts
        .map((p) => `• ${p.name} (เหลือ ${p.quantity} ชิ้น / ต้องการ ${p.minStockLevel} ชิ้น)`)
        .join("\n");

      const message = `
⚠️ เตือนสินค้าใกล้หมด!

องค์กร: ${org.name}
มีสินค้า ${lowStockProducts.length} รายการที่ใกล้หมด:

${productList}

กรุณาสั่งซื้อเพิ่มเติมโดยเร็วที่สุด

⏰ ${new Date().toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        dateStyle: "medium",
        timeStyle: "short",
      })}
`.trim();

      // Send to LINE
      const response = await fetch("https://notify-api.line.me/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${lineCred.accessToken}`,
        },
        body: new URLSearchParams({ message }),
      });

      if (response.ok) {
        alerts.sent++;
        alerts.products.push(...lowStockProducts.map((p) => p.name));
        alerts.organizations.push(org.name);
        console.log(`✅ Sent alert for ${org.name} (${lowStockProducts.length} products)`);
      } else {
        const error = await response.text();
        console.error(`❌ Failed to send alert for ${org.name}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      alerts,
      message: `Sent ${alerts.sent} alert(s) for ${alerts.products.length} product(s)`,
    });
  } catch (error: any) {
    console.error("Error checking stock:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check stock" },
      { status: 500 }
    );
  }
}
