// src/app/api/ai-chat/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

// ---------------------
// POST /api/ai-chat
// ---------------------
export async function POST(request: Request) {
  try {
    const currentUserData = await getCurrentUser();
    if (!currentUserData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!currentUserData.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const orgId = currentUserData.organizationId;

    // โหลดองค์กร + AI providers
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { aiProviders: true },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // ใช้เฉพาะ provider ที่ทดสอบผ่านแล้ว (isValid = true)
    const validProviders = organization.aiProviders.filter((p) => p.isValid);

    const {
      message,
      provider: requestedProvider,
      model: requestedModel,
      sessionId,
    } = await request.json();

    if (!message || !String(message).trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (validProviders.length === 0) {
      return NextResponse.json(
        {
          error:
            'ยังไม่มี AI Provider ที่ผ่านการทดสอบ กรุณาไปที่หน้า Settings แล้วกดปุ่ม "ทดสอบ" ให้ผ่านอย่างน้อย 1 ตัว',
        },
        { status: 400 }
      );
    }

    // เลือก provider ที่จะใช้
    const providerToUse =
      requestedProvider ||
      validProviders.find((p) => p.isDefault)?.provider ||
      validProviders[0]?.provider;

    const aiProvider =
      validProviders.find((p) => p.provider === providerToUse) ||
      validProviders[0];

    if (!aiProvider) {
      return NextResponse.json(
        {
          error:
            "ไม่พบ AI Provider ที่พร้อมใช้งาน กรุณาทดสอบการเชื่อมต่อที่หน้า Settings",
        },
        { status: 400 }
      );
    }

    // หา / สร้าง ChatSession
    let chatSession = null;

    if (sessionId) {
      chatSession = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId: currentUserData.id,
        },
      });
    }

    if (!chatSession) {
      const title =
        message.length > 60 ? message.substring(0, 60) + "..." : message;

      chatSession = await prisma.chatSession.create({
        data: {
          userId: currentUserData.id,
          title: title || "New Chat",
          provider: aiProvider.provider,
        },
      });
    }

    // บันทึกข้อความ USER
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: "USER",
        content: message,
      },
    });

    // ดึง context ของทั้งองค์กร
    const context = await getSystemContext(orgId);

    const apiKey = decrypt(aiProvider.apiKey);
    let responseText = "";

    if (aiProvider.provider === "GEMINI") {
      responseText = await callGemini(
        apiKey,
        message,
        context,
        requestedModel || aiProvider.modelName || undefined
      );
    } else if (aiProvider.provider === "OPENAI") {
      responseText = await callOpenAI(
        apiKey,
        message,
        context,
        requestedModel || aiProvider.modelName || undefined
      );
    } else if (aiProvider.provider === "N8N") {
      responseText = await callN8N(apiKey, message, context);
    } else {
      responseText = "ยังไม่รองรับ AI Provider ประเภทนี้";
    }

    // บันทึกข้อความ ASSISTANT
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: "ASSISTANT",
        content: responseText,
      },
    });

    await prisma.chatSession.update({
      where: { id: chatSession.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      sessionId: chatSession.id,
      reply: responseText,
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

// ---------------------
// ดึง context ทั้งระบบ (ใช้ organizationId)
// ---------------------
async function getSystemContext(organizationId: string) {
  const [products, campaigns, budgets, adAccounts, platformCreds] =
    await Promise.all([
      prisma.product.findMany({
        where: { organizationId },
      }),
      prisma.adCampaign.findMany({
        where: { organizationId },
      }),
      prisma.budget.findMany({
        where: { organizationId },
      }),
      prisma.adAccount.findMany({
        where: { organizationId },
        select: {
          id: true,
          platform: true,
          accountName: true,
          isActive: true,
          isDefault: true,
          isValid: true,
          lastTested: true,
          testMessage: true,
        },
      }),
      prisma.platformCredential.findMany({
        where: { organizationId },
        select: {
          id: true,
          platform: true,
          isValid: true,
          lastTested: true,
          testMessage: true,
        },
      }),
    ]);

  const lowStockProducts = products.filter(
    (p) => p.quantity < p.minStockLevel
  );
  const outOfStock = products.filter((p) => p.quantity === 0);

  const totalInventoryValue = products.reduce(
    (sum, p) => sum + p.quantity * p.costPrice,
    0
  );

  const totalAdSpend = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
  const avgROI =
    campaigns.length > 0
      ? campaigns.reduce((sum, c) => sum + (c.roi || 0), 0) /
        campaigns.length
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
      activeCampaigns: campaigns.filter(
        (c) => c.status === "ACTIVE"
      ).length,
      totalAdSpend,
      avgROI: Number.isFinite(avgROI) ? avgROI.toFixed(2) : "0.00",

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
    platformCreds: platformCreds.map((p) => ({
      platform: p.platform,
      isValid: p.isValid,
      lastTested: p.lastTested,
      testMessage: p.testMessage,
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
    case "google":
      return "Google";
    case "line":
      return "LINE";
    default:
      return platform;
  }
}

function formatAdAccounts(adAccounts: any[]) {
  const explicitDefault = adAccounts.find((a) => a.isDefault);
  const validDefault = adAccounts.find(
    (a) => a.isActive && a.isValid
  );
  const fallback = adAccounts[0];

  const defaultId = explicitDefault?.id ?? validDefault?.id ?? fallback?.id;

  return adAccounts.map((account, index) => {
    const isValid = account.isActive && account.isValid;

    let status: string;
    if (isValid) {
      status = "SUCCESS";
    } else if (account.lastTested) {
      status = "FAILED";
    } else {
      status = "PENDING";
    }

    return {
      platform: formatPlatformName(account.platform),
      accountName: account.accountName,
      isValid,
      isDefault: defaultId ? account.id === defaultId : index === 0,
      isActive: account.isActive,
      status,
    };
  });
}

// ---------------------
// System Prompt
// ---------------------
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
              `- ${acc.platform}: ${acc.accountName} - ${
                acc.isValid ? "✅ Connected" : "❌ Disconnected"
              }${acc.isDefault ? " [Default]" : ""}`
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

ฟีเจอร์ที่ระบบรองรับแล้ว:
- ผู้ใช้สามารถจัดการ Ad Accounts ได้ในหน้า Settings
- ผู้ใช้สามารถตั้งค่า Platform API Settings ในหน้า Settings
- AI ใช้ข้อมูลสินค้า แคมเปญ งบประมาณ และสถานะการเชื่อมต่อเพื่อช่วยวิเคราะห์

ให้ตอบเป็นภาษาไทย ใช้ข้อมูลจริงจาก businessData เท่านั้น ห้ามเดา

ข้อมูลดิบ (businessData):
${JSON.stringify(businessData, null, 2)}`;
}

// ---------------------
// Gemini API – เรียกแบบเดียวกับ /api/ai-settings
// ---------------------
// ---------------------
// Gemini API – ใช้ v1 (ไม่ใช้ v1beta แล้ว)
// ---------------------
// ---------------------
// Gemini API (เลือก endpoint อัตโนมัติ)
// ---------------------
async function callGemini(
  apiKey: string,
  message: string,
  context: any,
  modelName?: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context);

  // ตั้งค่า model และ endpoint ให้เหมาะสม
  const model = (modelName && modelName.trim()) || "gemini-1.5-flash";
  const isV1beta = model.startsWith("gemini-1.5") || model.startsWith("gemini-2.0");
  const endpoint = isV1beta ? "v1beta" : "v1";

  try {
    const fullText = `${systemPrompt}\n\nคำถามของผู้ใช้:\n${message}`;

    const url = `https://generativelanguage.googleapis.com/${endpoint}/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullText }],
          },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Gemini error:", data);
      const errorMessage =
        (data as any)?.error?.message ||
        "API Key ไม่ถูกต้อง หรือโมเดลไม่รองรับ generateContent";
      throw new Error(
        `ไม่สามารถเชื่อมต่อกับ Gemini ได้: ${errorMessage}\n\nตรวจสอบ API Key ที่หน้า Settings และตรวจสอบชื่อโมเดล (เช่น ${model})`
      );
    }

    const text =
      (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text ??
      (data as any)?.candidates?.[0]?.output_text;

    if (!text) {
      throw new Error("Gemini ไม่ได้ส่งข้อความกลับมา");
    }

    return text;
  } catch (error: any) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      "เกิดข้อผิดพลาดในการเชื่อมต่อกับ Gemini กรุณาลองใหม่อีกครั้ง"
    );
  }
}



// ---------------------
// OpenAI API
// ---------------------
async function callOpenAI(
  apiKey: string,
  message: string,
  context: any,
  modelName?: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context);
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

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("OpenAI error:", data);
      const errorMessage =
        (data as any)?.error?.message ||
        "API Key ไม่ถูกต้องหรือหมดโควต้า";
      throw new Error(
        `ไม่สามารถเชื่อมต่อกับ OpenAI ได้: ${errorMessage}\n\nกรุณาตรวจสอบ API Key ที่หน้า Settings (ตรวจดูชื่อโมเดล: ปัจจุบันใช้ "${model}") หรือเปลี่ยนไปใช้ Gemini`
      );
    }

    if (!(data as any).choices || !(data as any).choices[0]?.message?.content) {
      throw new Error(
        "OpenAI ไม่สามารถสร้างคำตอบได้ กรุณาลองถามใหม่อีกครั้ง"
      );
    }

    return (data as any).choices[0].message.content;
  } catch (error: any) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      "เกิดข้อผิดพลาดในการเชื่อมต่อกับ OpenAI กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือลองใหม่อีกครั้ง"
    );
  }
}

// ---------------------
// n8n Webhook
// ---------------------
async function callN8N(
  webhookUrl: string,
  message: string,
  context: any
): Promise<string> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context }),
    });

    if (!response.ok) {
      throw new Error(
        `ไม่สามารถเชื่อมต่อกับ n8n Webhook ได้ (HTTP ${response.status})\n\nกรุณาตรวจสอบ Webhook URL ที่หน้า Settings หรือตรวจสอบว่า n8n workflow กำลังทำงานอยู่`
      );
    }

    const data = await response.json().catch(() => ({}));

    if (!(data as any).response && !(data as any).message) {
      throw new Error(
        "n8n Webhook ไม่ส่งคำตอบกลับมา กรุณาตรวจสอบการตั้งค่า workflow"
      );
    }

    return (data as any).response || (data as any).message;
  } catch (error: any) {
    if (
      error.message &&
      error.message.includes("ไม่สามารถเชื่อมต่อกับ n8n")
    ) {
      throw error;
    }
    throw new Error(
      "เกิดข้อผิดพลาดในการเชื่อมต่อกับ n8n Webhook กรุณาตรวจสอบ URL หรือลองใหม่อีกครั้ง"
    );
  }
}
