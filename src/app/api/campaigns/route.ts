import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserData = await prisma.user.findUnique({
      where: { externalId: userId },
    });

    if (!currentUserData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ แก้ตรงนี้
    const user = await prisma.user.findUnique({
      where: { id: currentUserData.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    // ✅ ดึง provider แยก
    const aiProvider = await prisma.aIProvider.findFirst({
      where: {
        organizationId: user.organizationId,
        isDefault: true,
        isActive: true,
      },
    });

    if (!aiProvider) {
      return NextResponse.json(
        { error: "No AI provider configured" },
        { status: 400 }
      );
    }

    const { message, model, sessionId, provider } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create or load conversation
    let conversationId = sessionId;
    if (!conversationId) {
      const newConversation = await prisma.aIConversation.create({
        data: {
          userId: user.id,
          title: message.slice(0, 40) || "New Conversation",
          provider: provider || aiProvider.provider,
        },
      });
      conversationId = newConversation.id;
    }

    // Save user message
    await prisma.aIMessage.create({
      data: {
        conversationId,
        role: "USER",
        content: message,
      },
    });

    let reply = "No response generated";

    // Select AI provider
    if (aiProvider.provider === "GEMINI") {
      const genAI = new GoogleGenerativeAI(aiProvider.apiKey);
      const modelInstance = genAI.getGenerativeModel({
        model: model || "gemini-1.5-flash",
      });

      const result = await modelInstance.generateContent(message);
      reply = result?.response?.text() || "No response";
    } else if (aiProvider.provider === "OPENAI") {
      const openai = new OpenAI({
        apiKey: aiProvider.apiKey,
      });

      const completion = await openai.chat.completions.create({
        model: model || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Sakura AI Assistant." },
          { role: "user", content: message },
        ],
      });

      reply = completion.choices[0].message.content || "No response";
    } else if (aiProvider.provider === "N8N") {
      const response = await fetch(aiProvider.endpoint || "", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: message }),
      });
      const data = await response.json();
      reply = data.output || data.response || "No response from N8N workflow";
    }

    // Save AI message
    await prisma.aIMessage.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        content: reply,
      },
    });

    return NextResponse.json({
      reply,
      sessionId: conversationId,
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
