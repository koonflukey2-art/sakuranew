import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const currentUserData = await getCurrentUser();
    if (!currentUserData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUserData.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: "No organization found. Please contact support." },
        { status: 403 }
      );
    }

    const {
      message,
      provider: requestedProvider,
      model: requestedModel,
      sessionId,
    } = await request.json();

    // Fetch AI providers for organization
    const aiProviders = await prisma.aIProvider.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
      },
    });

    // หา provider ที่ขอมา หรือใช้ default
    const providerToUse = requestedProvider || aiProviders.find((p) => p.isDefault && p.isValid)?.provider;
    const aiProvider = aiProviders.find(
      (p) => p.provider === providerToUse && p.isValid
    );

    if (!aiProvider) {
      return NextResponse.json(
        { error: "กรุณาตั้งค่า AI Provider ที่หน้า Settings" },
        { status: 400 }
      );
    }

    // หา ChatSession หรือสร้างใหม่
    let chatSession;
    if (sessionId) {
      chatSession = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
        },
      });
    }

    if (!chatSession) {
      // สร้าง session ใหม่
      const title = message.length > 60 ? message.substring(0, 60) + "..." : message;
      chatSession = await prisma.chatSession.create({
        data: {
          userId: user.id,
          title,
          provider: aiProvider.provider,
        },
      });
    }

    // บันทึก USER message
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: "USER",
        content: message,
      },
    });

    // ดึงข้อมูลทั้งระบบ
    const context = await getSystemContext(user.organizationId);

    // เรียก AI
    const apiKey = decrypt(aiProvider.apiKey);
    let response = "";

    if (aiProvider.provider === "GEMINI") {
      response = await callGemini(apiKey, message, context);
    } else if (aiProvider.provider === "OPENAI") {
      response = await callOpenAI(
        apiKey,
        message,
        context,
        requestedModel || aiProvider.modelName || undefined
      );
    } else if (aiProvider.provider === "N8N") {
      response = await callN8N(apiKey, message, context);
    }

    // บันทึก ASSISTANT message
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: "ASSISTANT",
        content: response,
      },
    });

    // อัปเดต updatedAt ของ session (Prisma จะทำอัตโนมัติเพราะมี @updatedAt)
    await prisma.chatSession.update({
      where: { id: chatSession.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      sessionId: chatSession.id,
      reply: response,
      provider: aiProvider.provider,
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
async function getSystemContext(organizationId: string) {
  const [products, campaigns, budgets, adAccounts] = await Promise.all([
    prisma.product.findMany({ where: { organizationId } }),
    prisma.adCampaign.findMany({ where: { organizationId } }),
    prisma.budget.findMany({ where: { organizationId } }),
    prisma.adAccount.findMany({
      where: { organizationId },
      select: {
        id: true,
        platform: true,
        accountName: true,
        name: true,
        isActive: true,
        isValid: true,
      },
    }),
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
    adAccounts: formatAdAccounts(adAccounts),
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

function formatPlatformName(platform: string) {
  const normalized = platform.toLowerCase();

  switch (normalized) {
    case "facebook":
      return "Facebook";
    case "tiktok":
      return "TikTok";
    case "lazada":
      return "Lazada";
    case "shopee":
      return "Shopee";
    default:
      return platform;
  }
}

function formatAdAccounts(adAccounts: any[]) {
  const defaultId = adAccounts.find((a) => a.isActive && a.lastTestStatus === "SUCCESS")?.id;

  return adAccounts.map((account, index) => ({
    platform: formatPlatformName(account.platform),
    accountName: account.name,
    isValid: account.isActive && account.lastTestStatus === "SUCCESS",
    isDefault: defaultId ? account.id === defaultId : index === 0,
    isActive: account.isActive,
    status: account.lastTestStatus || "PENDING",
  }));
}

function buildSystemPrompt(context: any) {
  const businessData = {
    products: context.products,
    campaigns: context.campaigns,
    budgets: context.budgets,
    adAccounts: context.adAccounts,
    platformCreds: context.platformCreds || [],
  };

  const adAccountsOverview =
    businessData.adAccounts.length > 0
      ? businessData.adAccounts
          .map(
            (acc: any) =>
              `- ${acc.platform}: ${acc.accountName} - ${acc.isValid ? "✅ Connected" : "❌ Disconnected"}${acc.isDefault ? " [Default]" : ""}`
          )
          .join("\n")
      : "- ยังไม่มีการเชื่อมต่อ Ad Account";

  const platformCredsOverview =
    businessData.platformCreds.length > 0
      ? businessData.platformCreds
          .map(
            (p: any) =>
              `- ${p.platform}: ${p.isValid ? "✅ Connected" : "❌ Invalid"}`
          )
          .join("\n")
      : "- ยังไม่มีการตั้งค่า Platform API";

  return `คุณคือผู้ช่วย AI สำหรับระบบจัดการธุรกิจและโฆษณาออนไลน์ของผู้ใช้

ข้อมูลปัจจุบัน:
- สินค้า: ${businessData.products.length} รายการ
- แคมเปญโฆษณา: ${businessData.campaigns.length} แคมเปญ
- งบประมาณ: ${businessData.budgets.length} รายการ
- Ad Accounts: ${businessData.adAccounts.length} บัญชี
- แพลตฟอร์มที่เชื่อมต่อ: ${businessData.platformCreds.length} แพลตฟอร์ม

Ad Accounts:
${adAccountsOverview}

Platform API Connections:
${platformCredsOverview}

ฟีเจอร์ที่ระบบรองรับแล้ว (สำคัญสำหรับการตอบ):
- ผู้ใช้สามารถจัดการ Ad Accounts ได้ในหน้า Settings (เพิ่ม / ลบ / แก้ไข / ทดสอบการเชื่อมต่อ และตั้งเป็น Default)
- ผู้ใช้สามารถตั้งค่า Platform API Settings ในหน้า Settings สำหรับเชื่อมต่อกับแพลตฟอร์มหลัก (Facebook Ads, TikTok Ads, Lazada, Shopee)
- Platform Credentials ทำงานเป็น fallback หาก Ad Account ไม่มี API key/token ระบบจะใช้ token จาก Platform Credentials แทน
- หน้า Ads ผู้ใช้ต้องเลือก Ad Account เมื่อสร้างแคมเปญใหม่ และแคมเปญจะถูกผูกกับ Ad Account ที่เลือก
- หน้า Automation ผู้ใช้สามารถเลือก Ad Account เฉพาะ หรือใช้ทุกบัญชี เมื่อสร้างกฎอัตโนมัติ
- ข้อมูล API key / access token ของ Ad Accounts และ Platform Credentials ถูกเข้ารหัสก่อนเก็บในฐานข้อมูล (ผ่านโมดูล crypto)
- AI สามารถใช้ข้อมูลสินค้า แคมเปญ งบประมาณ และสถานะของแต่ละ Ad Account และ Platform API เพื่อช่วยวิเคราะห์และให้คำแนะนำ
- AI Dashboard รองรับการวิเคราะห์แคมเปญ Facebook และแนะนำสินค้าโดยใช้ Gemini AI

หลักการตอบ:
- ใช้ข้อมูลจาก businessData.products, businessData.campaigns, businessData.budgets, businessData.adAccounts และ businessData.platformCreds เท่านั้น ห้ามเดาข้อมูลที่ไม่มีอยู่จริง
- คุณสามารถอ้างอิงสถานะการเชื่อมต่อ Platform API (เช่น Facebook Ads, TikTok Ads, Lazada, Shopee) ในคำแนะนำได้
- คุณ **ยังไม่สามารถเรียก API ภายนอกเอง** ให้ตอบเฉพาะจากข้อมูลที่ระบบเตรียมไว้ให้เท่านั้น
- ถ้า Ad Account ใด isValid = false ให้แจ้งผู้ใช้ตามจริง และแนะนำให้กลับไปทดสอบการเชื่อมต่อในหน้า Settings
- ถ้าผู้ใช้ไม่ได้ระบุแพลตฟอร์ม ให้ถามย้อนว่าต้องการดูข้อมูลของแพลตฟอร์มใด (Facebook / Google / TikTok / LINE) หรือดูภาพรวมทุกแพลตฟอร์ม
- ถ้าข้อมูลในระบบยังว่าง (ไม่มี Ad Account / แคมเปญ / งบประมาณ) ให้ตอบตรงไปตรงมา และแนะนำขั้นตอนเริ่มต้น เช่น ให้ไปเพิ่ม Ad Account หรือสร้างแคมเปญใหม่
- ให้ตอบเป็นภาษาไทยที่เข้าใจง่าย เน้นเชื่อมโยงกับข้อมูลจริงในระบบ และแนะนำขั้นตอนปฏิบัติที่ผู้ใช้ทำได้จากหน้า UI ปัจจุบัน

ข้อมูลดิบ (businessData):
${JSON.stringify(businessData, null, 2)}`;
}

// Gemini API
async function callGemini(apiKey: string, message: string, context: any) {
  const systemPrompt = buildSystemPrompt(context);

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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || "API Key ไม่ถูกต้องหรือหมดอายุ";
      throw new Error(
        `ไม่สามารถเชื่อมต่อกับ Gemini ได้: ${errorMessage}\n\nกรุณาตรวจสอบ API Key ที่หน้า Settings หรือลองใช้ AI Provider อื่น`
      );
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      throw new Error("Gemini ไม่สามารถสร้างคำตอบได้ กรุณาลองถามใหม่อีกครั้ง");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error: any) {
    // ถ้า error มี message ที่เป็นภาษาไทยอยู่แล้ว ให้ใช้ต่อ
    if (error.message && error.message.includes("ไม่สามารถเชื่อมต่อกับ Gemini")) {
      throw error;
    }
    // ถ้าไม่ใช่ ให้สร้าง error message ใหม่
    throw new Error("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Gemini กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือลองใหม่อีกครั้ง");
  }
}

// OpenAI API
async function callOpenAI(
  apiKey: string,
  message: string,
  context: any,
  modelName?: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context);

  // ใช้ model จากการตั้งค่า ถ้ามี, ถ้าไม่มีก็ใช้ gpt-4o-mini เป็นค่าเริ่มต้น
  const model = (modelName && modelName.trim()) || "gpt-4o-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || "API Key ไม่ถูกต้องหรือหมดโควต้า";
      throw new Error(
        `ไม่สามารถเชื่อมต่อกับ OpenAI ได้: ${errorMessage}\n\nกรุณาตรวจสอบ API Key ที่หน้า Settings (ตรวจดูชื่อโมเดล: ปัจจุบันใช้ "${model}") หรือเปลี่ยนไปใช้ Gemini (ฟรี)`
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("OpenAI ไม่สามารถสร้างคำตอบได้ กรุณาลองถามใหม่อีกครั้ง");
    }

    return data.choices[0].message.content;
  } catch (error: any) {
    // ถ้า error มี message ที่เป็นภาษาไทยอยู่แล้ว ให้ใช้ต่อ
    if (error instanceof Error) {
      throw error;
    }
    // ถ้าไม่ใช่ ให้สร้าง error message ใหม่
    throw new Error("เกิดข้อผิดพลาดในการเชื่อมต่อกับ OpenAI กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือลองใหม่อีกครั้ง");
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

    if (!response.ok) {
      throw new Error(`ไม่สามารถเชื่อมต่อกับ n8n Webhook ได้ (HTTP ${response.status})\n\nกรุณาตรวจสอบ Webhook URL ที่หน้า Settings หรือตรวจสอบว่า n8n workflow กำลังทำงานอยู่`);
    }

    const data = await response.json();

    if (!data.response && !data.message) {
      throw new Error("n8n Webhook ไม่ส่งคำตอบกลับมา กรุณาตรวจสอบการตั้งค่า workflow");
    }

    return data.response || data.message;
  } catch (error: any) {
    // ถ้า error มี message ที่เป็นภาษาไทยอยู่แล้ว ให้ใช้ต่อ
    if (error.message && error.message.includes("ไม่สามารถเชื่อมต่อกับ n8n")) {
      throw error;
    }
    // ถ้าไม่ใช่ ให้สร้าง error message ใหม่
    throw new Error("เกิดข้อผิดพลาดในการเชื่อมต่อกับ n8n Webhook กรุณาตรวจสอบ URL หรือลองใหม่อีกครั้ง");
  }
}
