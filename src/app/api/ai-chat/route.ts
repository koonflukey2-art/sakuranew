import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      include: { aiProviders: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { message } = await request.json();

    // หา default provider
    const defaultProvider = user.aiProviders.find((p) => p.isDefault && p.isValid);

    if (!defaultProvider) {
      return NextResponse.json(
        { error: "กรุณาตั้งค่า AI Provider ที่หน้า Settings" },
        { status: 400 }
      );
    }

    // ดึงข้อมูลทั้งระบบ
    const context = await getSystemContext(user.id);

    // เรียก AI
    const apiKey = decrypt(defaultProvider.apiKey);
    let response = "";

    if (defaultProvider.provider === "GEMINI") {
      response = await callGemini(apiKey, message, context);
    } else if (defaultProvider.provider === "OPENAI") {
      response = await callOpenAI(apiKey, message, context);
    } else if (defaultProvider.provider === "N8N") {
      response = await callN8N(apiKey, message, context);
    }

    return NextResponse.json({
      response,
      provider: defaultProvider.provider,
    });
  } catch (error: any) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to chat" },
      { status: 500 }
    );
  }
}

// ดึงข้อมูลทั้งระบบ
async function getSystemContext(userId: string) {
  const [products, campaigns, budgets] = await Promise.all([
    prisma.product.findMany({ where: { userId } }),
    prisma.adCampaign.findMany({ where: { userId } }),
    prisma.budget.findMany({ where: { userId } }),
  ]);

  // คำนวณสถิติ
  const lowStockProducts = products.filter((p) => p.quantity < p.minStockLevel);
  const outOfStock = products.filter((p) => p.quantity === 0);

  const totalInventoryValue = products.reduce(
    (sum, p) => sum + p.quantity * p.costPrice,
    0
  );

  const totalRevenue = campaigns.reduce(
    (sum, c) => sum + (c.conversions * (c.spent / (c.conversions || 1))),
    0
  );

  const totalAdSpend = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const avgROI = campaigns.length > 0
    ? campaigns.reduce((sum, c) => sum + c.roi, 0) / campaigns.length
    : 0;

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  return {
    summary: {
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStock.length,
      inventoryValue: totalInventoryValue,
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === "ACTIVE").length,
      totalAdSpend,
      avgROI: avgROI.toFixed(2),
      totalBudget,
      totalSpent,
      budgetRemaining: totalBudget - totalSpent,
    },
    products: products.map((p) => ({
      name: p.name,
      category: p.category,
      quantity: p.quantity,
      minStock: p.minStockLevel,
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      profit: p.sellPrice - p.costPrice,
    })),
    campaigns: campaigns.map((c) => ({
      name: c.campaignName,
      platform: c.platform,
      budget: c.budget,
      spent: c.spent,
      roi: c.roi,
      conversions: c.conversions,
      status: c.status,
    })),
    budgets: budgets.map((b) => ({
      purpose: b.purpose,
      amount: b.amount,
      spent: b.spent,
      remaining: b.amount - b.spent,
    })),
    alerts: {
      lowStock: lowStockProducts.map((p) => ({
        name: p.name,
        current: p.quantity,
        min: p.minStockLevel,
        shortage: p.minStockLevel - p.quantity,
      })),
      outOfStock: outOfStock.map((p) => p.name),
      overBudget: budgets
        .filter((b) => b.spent > b.amount)
        .map((b) => b.purpose),
    },
  };
}

// Gemini API
async function callGemini(apiKey: string, message: string, context: any) {
  const systemPrompt = `คุณคือ AI Assistant ที่เชี่ยวชาญด้านการจัดการธุรกิจ E-commerce

ข้อมูลธุรกิจปัจจุบัน:
📦 สินค้า: ${context.summary.totalProducts} รายการ
- สต็อกต่ำ: ${context.summary.lowStockCount} รายการ
- หมด: ${context.summary.outOfStockCount} รายการ
- มูลค่าสต็อก: ฿${context.summary.inventoryValue.toLocaleString()}

📢 แคมเปญ: ${context.summary.totalCampaigns} แคมเปญ
- กำลังดำเนินการ: ${context.summary.activeCampaigns} แคมเปญ
- ค่าโฆษณาทั้งหมด: ฿${context.summary.totalAdSpend.toLocaleString()}
- ROI เฉลี่ย: ${context.summary.avgROI}x

💰 งบประมาณ:
- งบทั้งหมด: ฿${context.summary.totalBudget.toLocaleString()}
- ใช้ไป: ฿${context.summary.totalSpent.toLocaleString()}
- เหลือ: ฿${context.summary.budgetRemaining.toLocaleString()}

⚠️ แจ้งเตือน:
${context.alerts.lowStock.length > 0 ? `- สินค้าสต็อกต่ำ: ${context.alerts.lowStock.map((p: any) => p.name).join(", ")}` : ""}
${context.alerts.outOfStock.length > 0 ? `- สินค้าหมด: ${context.alerts.outOfStock.join(", ")}` : ""}
${context.alerts.overBudget.length > 0 ? `- เกินงบ: ${context.alerts.overBudget.join(", ")}` : ""}

รายละเอียดสินค้า:
${context.products.slice(0, 10).map((p: any) =>
  `- ${p.name} (${p.category}): ${p.quantity} ชิ้น, ราคาขาย ฿${p.sellPrice}, กำไร/ชิ้น ฿${p.profit}`
).join("\n")}

รายละเอียดแคมเปญ:
${context.campaigns.slice(0, 10).map((c: any) =>
  `- ${c.name} (${c.platform}): ROI ${c.roi}x, Conversions ${c.conversions}, Status: ${c.status}`
).join("\n")}

คำสั่ง:
1. ตอบคำถามโดยใช้ข้อมูลจริงจากระบบ
2. แนะนำอย่างเฉพาะเจาะจง มีตัวเลขประกอบ
3. ถ้าถามเรื่องสต็อก ให้ดูจาก products
4. ถ้าถามเรื่องโฆษณา ให้ดูจาก campaigns
5. ถ้าถามเรื่องงบ ให้ดูจาก budgets
6. ตอบเป็นภาษาไทย กระชับ ชัดเจน
7. ใช้ emoji ประกอบเล็กน้อย`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: systemPrompt }] },
            { parts: [{ text: message }] },
          ],
        }),
      }
    );

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || "ไม่สามารถตอบได้";
  } catch (error) {
    throw new Error("Gemini API error");
  }
}

// OpenAI API
async function callOpenAI(apiKey: string, message: string, context: any) {
  const systemPrompt = `คุณคือ AI Assistant สำหรับระบบ E-commerce

ข้อมูลธุรกิจ:
${JSON.stringify(context, null, 2)}

ตอบคำถามโดยใช้ข้อมูลจริง แนะนำอย่างเฉพาะเจาะจง ตอบเป็นภาษาไทย`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || "ไม่สามารถตอบได้";
  } catch (error) {
    throw new Error("OpenAI API error");
  }
}

// n8n Webhook
async function callN8N(webhookUrl: string, message: string, context: any) {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context }),
    });

    const data = await response.json();
    return data.response || data.message || "ไม่สามารถตอบได้";
  } catch (error) {
    throw new Error("n8n Webhook error");
  }
}
