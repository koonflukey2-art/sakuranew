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
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { message, provider, sessionId } = body;

    // ดึง config ของ provider
    const config = await prisma.aiConfig.findFirst({
      where: {
        userId: user.id,
        provider,
        isValid: true,
      },
    });

    if (!config) {
      return NextResponse.json(
        { error: `${provider} not configured or invalid` },
        { status: 400 }
      );
    }

    // ดึง session หรือสร้างใหม่
    let session;
    if (sessionId) {
      session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    } else {
      session = await prisma.chatSession.create({
        data: {
          userId: user.id,
          provider,
          title: message.substring(0, 50),
        },
        include: { messages: true },
      });
    }

    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // บันทึกข้อความของ user
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "USER",
        content: message,
      },
    });

    // ดึงข้อมูลระบบสำหรับ context
    const systemContext = await getSystemContext(user.id);

    // ส่งไปยัง AI
    const apiKey = decrypt(config.apiKey);
    let aiResponse = "";

    if (provider === "GEMINI") {
      aiResponse = await callGemini(apiKey, message, session.messages, systemContext);
    } else if (provider === "OPENAI") {
      aiResponse = await callOpenAI(apiKey, message, session.messages, systemContext);
    } else if (provider === "N8N") {
      aiResponse = await callN8N(apiKey, message, systemContext);
    }

    // บันทึกข้อความจาก AI
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "ASSISTANT",
        content: aiResponse,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      message: assistantMessage,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}

// ดึงข้อมูลระบบสำหรับ RAG
async function getSystemContext(userId: string) {
  const [products, campaigns, budgets] = await Promise.all([
    prisma.product.findMany({ where: { userId }, take: 10 }),
    prisma.adCampaign.findMany({ where: { userId }, take: 10 }),
    prisma.budget.findMany({ where: { userId }, take: 10 }),
  ]);

  return {
    products: products.map((p) => ({
      name: p.name,
      category: p.category,
      quantity: p.quantity,
      sellPrice: p.sellPrice,
    })),
    campaigns: campaigns.map((c) => ({
      name: c.campaignName,
      platform: c.platform,
      budget: c.budget,
      roi: c.roi,
      status: c.status,
    })),
    budgets: budgets.map((b) => ({
      purpose: b.purpose,
      amount: b.amount,
      spent: b.spent,
    })),
  };
}

// AI API calls
async function callGemini(
  apiKey: string,
  message: string,
  history: any[],
  context: any
): Promise<string> {
  const systemPrompt = `You are a helpful e-commerce business assistant.
You have access to the user's business data:
Products: ${JSON.stringify(context.products)}
Campaigns: ${JSON.stringify(context.campaigns)}
Budgets: ${JSON.stringify(context.budgets)}

Answer questions about their business using this data.`;

  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    ...history.map((msg) => ({
      role: msg.role === "USER" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    }
  );

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || "No response";
}

async function callOpenAI(
  apiKey: string,
  message: string,
  history: any[],
  context: any
): Promise<string> {
  const systemPrompt = `You are a helpful e-commerce business assistant with access to the user's data:
Products: ${JSON.stringify(context.products)}
Campaigns: ${JSON.stringify(context.campaigns)}
Budgets: ${JSON.stringify(context.budgets)}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((msg) => ({
      role: msg.role.toLowerCase(),
      content: msg.content,
    })),
    { role: "user", content: message },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages,
    }),
  });

  const data = await response.json();
  return data.choices[0]?.message?.content || "No response";
}

async function callN8N(webhookUrl: string, message: string, context: any): Promise<string> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context }),
  });

  const data = await response.json();
  return data.response || data.message || "No response";
}
