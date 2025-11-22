import { NextRequest, NextResponse } from "next/server";
import { AiProviderId, getProviderById } from "@/lib/ai-providers";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, model, messages } = body as {
      provider: AiProviderId;
      model: string;
      messages: Array<{ role: string; content: string }>;
    };

    if (!provider || !model || !messages) {
      return NextResponse.json(
        { error: "Provider, model, and messages are required" },
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
          error: `ยังไม่ได้ตั้งค่า ${providerConfig.envKey}`,
        },
        { status: 400 }
      );
    }

    // Call appropriate AI provider
    let response;
    try {
      switch (provider) {
        case "openai":
          response = await chatOpenAI(apiKey, model, messages);
          break;
        case "anthropic":
          response = await chatAnthropic(apiKey, model, messages);
          break;
        case "gemini":
          response = await chatGemini(apiKey, model, messages);
          break;
        default:
          throw new Error("Unsupported provider");
      }

      return NextResponse.json({
        success: true,
        message: response,
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          error: `การเรียกใช้ ${providerConfig.name} ล้มเหลว: ${error.message}`,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// OpenAI Chat
async function chatOpenAI(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "OpenAI API error");
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

// Anthropic Chat
async function chatAnthropic(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Anthropic API error");
  }

  const data = await response.json();
  return data.content[0]?.text || "";
}

// Gemini Chat
async function chatGemini(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
) {
  // Convert messages to Gemini format
  const contents = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gemini API error");
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || "";
}
