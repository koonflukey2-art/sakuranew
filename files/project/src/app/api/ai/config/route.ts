import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

// GET - ดึง AI configs ทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, organizationId: true },
    });

    if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const orgId = dbUser.organizationId;
      if (!orgId) {
        return NextResponse.json({ error: "Organization not found" }, { status: 400 });
      }

    // ไม่ส่ง API key กลับไป แค่บอกว่ามีหรือไม่
      const providers = await prisma.aIProvider.findMany({
        where: { organizationId: orgId },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      });

      const configs = providers.map((p) => ({
        id: p.id,
        provider: p.provider,
        modelName: p.modelName,
        isActive: p.isActive,
        isDefault: p.isDefault,
        isValid: p.isValid,
        hasApiKey: !!p.apiKey,
        lastTested: p.lastTested,
      }));

      return NextResponse.json(configs);
  } catch (error) {
    console.error("Get AI configs error:", error);
    return NextResponse.json({ error: "Failed to fetch configs" }, { status: 500 });
  }
}

// POST - เพิ่ม/อัพเดท AI config
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    

      const orgId = dbUser.organizationId;
      if (!orgId) {
        return NextResponse.json({ error: "Organization not found" }, { status: 400 });
      }
const body = await request.json();
    const { provider, apiKey } = body;

    // Encrypt API key
    const encryptedKey = encrypt(apiKey);

    // Upsert config
    const config = await prisma.aIProvider.upsert({
      where: {
        organizationId_provider: {
            organizationId: orgId,
            provider,
        },
      },
      update: {
        apiKey: encryptedKey,
        isValid: false, // จะทดสอบทีหลัง
        lastTested: null,
      },
      create: {
          organizationId: orgId,

        provider,
        apiKey: encryptedKey,
      },
    });

    return NextResponse.json({
      id: config.id,
      provider: config.provider,
      isActive: config.isActive,
      isValid: config.isValid,
    });
  } catch (error) {
    console.error("Save AI config error:", error);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}

// PUT - ทดสอบ API key
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    

      const orgId = dbUser.organizationId;
      if (!orgId) {
        return NextResponse.json({ error: "Organization not found" }, { status: 400 });
      }
const { searchParams } = new URL(request.url);
    const configId = searchParams.get("id");

    if (!configId) {
      return NextResponse.json({ error: "Config ID required" }, { status: 400 });
    }

    const config = await prisma.aIProvider.findUnique({
      where: { id: configId },
    });

    if (!config || config.organizationId !== dbUser.organizationId) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    // Decrypt API key
    const apiKey = decrypt(config.apiKey);

    // ทดสอบ API key ตาม provider
    let isValid = false;
    try {
      if (config.provider === "GEMINI") {
        isValid = await testGeminiKey(apiKey);
      } else if (config.provider === "OPENAI") {
        isValid = await testOpenAIKey(apiKey);
      } else if (config.provider === "N8N") {
        isValid = await testN8NWebhook(apiKey);
      }
    } catch (error) {
      console.error("Test API key error:", error);
      isValid = false;
    }

    // อัพเดทสถานะ
    const updatedConfig = await prisma.aIProvider.update({
      where: { id: configId },
      data: {
        isValid,
        lastTested: new Date(),
      },
    });

    return NextResponse.json({
      isValid,
      message: isValid ? "API key is valid" : "API key is invalid",
    });
  } catch (error) {
    console.error("Test AI config error:", error);
    return NextResponse.json({ error: "Failed to test config" }, { status: 500 });
  }
}

// Helper functions
async function testGeminiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello" }] }],
        }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function testOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function testN8NWebhook(webhookUrl: string): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
