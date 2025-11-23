import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

// GET - ดึง AI providers ทั้งหมด
export async function GET() {
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

    const providers = user.aiProviders.map((p) => ({
      id: p.id,
      provider: p.provider,
      modelName: p.modelName,
      isActive: p.isActive,
      isDefault: p.isDefault,
      isValid: p.isValid,
      lastTested: p.lastTested,
      hasApiKey: !!p.apiKey,
    }));

    return NextResponse.json(providers);
  } catch (error) {
    console.error("Get AI settings error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST - บันทึก/อัพเดท API Key
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
    const { provider, apiKey, modelName } = body;

    const encryptedKey = encrypt(apiKey);

    const aiProvider = await prisma.aIProvider.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider,
        },
      },
      update: {
        apiKey: encryptedKey,
        modelName,
        isValid: false,
        lastTested: null,
      },
      create: {
        userId: user.id,
        provider,
        apiKey: encryptedKey,
        modelName,
      },
    });

    return NextResponse.json({
      id: aiProvider.id,
      provider: aiProvider.provider,
      message: "บันทึกสำเร็จ",
    });
  } catch (error) {
    console.error("Save AI settings error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

// PUT - ทดสอบ API Key
export async function PUT(request: Request) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("id");

    if (!providerId) {
      return NextResponse.json({ error: "Provider ID required" }, { status: 400 });
    }

    const aiProvider = await prisma.aIProvider.findUnique({
      where: { id: providerId },
    });

    if (!aiProvider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const apiKey = decrypt(aiProvider.apiKey);
    let isValid = false;
    let testMessage = "";

    try {
      if (aiProvider.provider === "GEMINI") {
        const result = await testGemini(apiKey);
        isValid = result.success;
        testMessage = result.message;
      } else if (aiProvider.provider === "OPENAI") {
        const result = await testOpenAI(apiKey);
        isValid = result.success;
        testMessage = result.message;
      } else if (aiProvider.provider === "N8N") {
        const result = await testN8N(apiKey);
        isValid = result.success;
        testMessage = result.message;
      }
    } catch (error: any) {
      isValid = false;
      testMessage = error.message || "การทดสอบล้มเหลว";
    }

    await prisma.aIProvider.update({
      where: { id: providerId },
      data: {
        isValid,
        testMessage,
        lastTested: new Date(),
      },
    });

    return NextResponse.json({
      success: isValid,
      message: testMessage,
    });
  } catch (error) {
    console.error("Test AI provider error:", error);
    return NextResponse.json({ error: "Failed to test" }, { status: 500 });
  }
}

// DELETE - ลบ provider
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("id");

    if (!providerId) {
      return NextResponse.json({ error: "Provider ID required" }, { status: 400 });
    }

    await prisma.aIProvider.delete({
      where: { id: providerId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete provider error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

// Helper functions
async function testGemini(apiKey: string) {
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

    if (response.ok) {
      return { success: true, message: "✅ Gemini API Key ใช้งานได้" };
    } else {
      const error = await response.json();
      return { success: false, message: `❌ ${error.error?.message || "API Key ไม่ถูกต้อง"}` };
    }
  } catch (error: any) {
    return { success: false, message: `❌ ${error.message}` };
  }
}

async function testOpenAI(apiKey: string) {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (response.ok) {
      return { success: true, message: "✅ OpenAI API Key ใช้งานได้" };
    } else {
      return { success: false, message: "❌ OpenAI API Key ไม่ถูกต้อง" };
    }
  } catch (error: any) {
    return { success: false, message: `❌ ${error.message}` };
  }
}

async function testN8N(webhookUrl: string) {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true, message: "Test connection" }),
    });

    if (response.ok) {
      return { success: true, message: "✅ n8n Webhook ใช้งานได้" };
    } else {
      return { success: false, message: "❌ n8n Webhook ไม่ถูกต้อง" };
    }
  } catch (error: any) {
    return { success: false, message: `❌ ${error.message}` };
  }
}
