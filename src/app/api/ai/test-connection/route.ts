import { NextRequest, NextResponse } from "next/server";
import { AiProviderId, getProviderById } from "@/lib/ai-providers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider } = body as { provider: AiProviderId };

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    const providerConfig = getProviderById(provider);
    if (!providerConfig) {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    // Check if API key is set in environment
    const apiKey = process.env[providerConfig.envKey];
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: `ยังไม่ได้ตั้งค่า ${providerConfig.envKey}`,
        },
        { status: 200 }
      );
    }

    // Test API connection based on provider
    let testResult;
    try {
      switch (provider) {
        case "openai":
          testResult = await testOpenAI(apiKey);
          break;
        case "anthropic":
          testResult = await testAnthropic(apiKey);
          break;
        case "gemini":
          testResult = await testGemini(apiKey);
          break;
        default:
          throw new Error("Unsupported provider");
      }

      return NextResponse.json({
        success: true,
        message: `เชื่อมต่อ ${providerConfig.name} สำเร็จ`,
        data: testResult,
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          message: `การเชื่อมต่อ ${providerConfig.name} ล้มเหลว: ${error.message}`,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Test OpenAI connection
async function testOpenAI(apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "OpenAI API error");
  }

  const data = await response.json();
  return {
    modelsCount: data.data?.length || 0,
  };
}

// Test Anthropic connection
async function testAnthropic(apiKey: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 10,
      messages: [{ role: "user", content: "test" }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Anthropic API error");
  }

  return {
    status: "connected",
  };
}

// Test Gemini connection
async function testGemini(apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gemini API error");
  }

  const data = await response.json();
  return {
    modelsCount: data.models?.length || 0,
  };
}
