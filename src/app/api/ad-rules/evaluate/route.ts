import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { canEditAds } from "@/lib/permissions";

// Helper to get AI provider for evaluation
async function getActiveAIProvider(userId: string) {
  const provider = await prisma.aIProvider.findFirst({
    where: {
      userId,
      isActive: true,
      isValid: true,
    },
    orderBy: {
      isDefault: "desc",
    },
  });

  return provider;
}

// Helper to call AI for rule evaluation
async function evaluateRuleWithAI(
  rule: any,
  campaignData: any,
  provider: any
): Promise<{ shouldExecute: boolean; reason: string }> {
  try {
    // Decrypt API key
    const apiKey = Buffer.from(provider.apiKey, "base64").toString("utf-8");

    const prompt = `
You are an AI assistant evaluating ad campaign rules.

Rule: ${rule.name}
Description: ${rule.description || "N/A"}
Condition: ${rule.condition}
Action: ${rule.action}

Current Campaign Data:
${JSON.stringify(campaignData, null, 2)}

Based on the rule condition and current campaign data, should we execute the action?
Respond in JSON format:
{
  "shouldExecute": true/false,
  "reason": "explanation in Thai"
}
`;

    let responseText = "";

    if (provider.provider === "GEMINI") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await response.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (provider.provider === "OPENAI") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: provider.modelName || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      responseText = data.choices?.[0]?.message?.content || "";
    }

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        shouldExecute: result.shouldExecute || false,
        reason: result.reason || "ไม่มีเหตุผล",
      };
    }

    return {
      shouldExecute: false,
      reason: "ไม่สามารถประมวลผลได้",
    };
  } catch (error) {
    console.error("Error evaluating with AI:", error);
    return {
      shouldExecute: false,
      reason: "เกิดข้อผิดพลาดในการประเมิน",
    };
  }
}

// Helper to evaluate rule without AI (simple condition parsing)
function evaluateRuleSimple(
  rule: any,
  campaignData: any
): { shouldExecute: boolean; reason: string } {
  try {
    const condition = rule.condition.toLowerCase();

    // Simple condition parsing (example)
    // "CPA > 200" or "ROI < 1.5" or "Spent > 5000"
    const conditionMatch = condition.match(/(\w+)\s*(>|<|>=|<=|==)\s*(\d+\.?\d*)/);

    if (!conditionMatch) {
      return {
        shouldExecute: false,
        reason: "เงื่อนไขไม่ถูกต้อง",
      };
    }

    const [, metric, operator, valueStr] = conditionMatch;
    const value = parseFloat(valueStr);

    // Calculate CPA, ROI, etc. from campaign data
    const metrics: any = {};

    if (campaignData.campaigns?.length > 0) {
      const totals = campaignData.campaigns.reduce(
        (acc: any, c: any) => ({
          spent: acc.spent + (c.spent || 0),
          conversions: acc.conversions + (c.conversions || 0),
          clicks: acc.clicks + (c.clicks || 0),
        }),
        { spent: 0, conversions: 0, clicks: 0 }
      );

      metrics.cpa = totals.conversions > 0 ? totals.spent / totals.conversions : 0;
      metrics.roi = campaignData.roi || 0;
      metrics.spent = totals.spent;
      metrics.clicks = totals.clicks;
    }

    const metricValue = metrics[metric.toLowerCase()] || 0;
    let shouldExecute = false;

    switch (operator) {
      case ">":
        shouldExecute = metricValue > value;
        break;
      case "<":
        shouldExecute = metricValue < value;
        break;
      case ">=":
        shouldExecute = metricValue >= value;
        break;
      case "<=":
        shouldExecute = metricValue <= value;
        break;
      case "==":
        shouldExecute = metricValue === value;
        break;
    }

    return {
      shouldExecute,
      reason: shouldExecute
        ? `${metric.toUpperCase()} (${metricValue.toFixed(2)}) ${operator} ${value}`
        : `${metric.toUpperCase()} (${metricValue.toFixed(2)}) ไม่ ${operator} ${value}`,
    };
  } catch (error) {
    return {
      shouldExecute: false,
      reason: "เกิดข้อผิดพลาดในการประเมิน",
    };
  }
}

// POST: Evaluate ad rules
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!canEditAds(user.role)) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ประเมิน Ad Rules" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ruleId } = body;

    if (!ruleId) {
      return NextResponse.json(
        { error: "กรุณาระบุ rule ID" },
        { status: 400 }
      );
    }

    // Fetch rule
    const rule = await prisma.adRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.userId !== user.id) {
      return NextResponse.json(
        { error: "Ad rule not found" },
        { status: 404 }
      );
    }

    // Fetch campaign data for the platform
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        userId: user.id,
        ...(rule.platform && { platform: rule.platform }),
      },
      orderBy: { createdAt: "desc" },
    });

    const campaignData = {
      campaigns,
      totalSpent: campaigns.reduce((sum, c) => sum + c.spent, 0),
      totalConversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
      totalClicks: campaigns.reduce((sum, c) => sum + c.clicks, 0),
      roi: campaigns.reduce((sum, c) => sum + c.roi, 0) / (campaigns.length || 1),
    };

    let evaluation;

    if (rule.useAI) {
      // Use AI for evaluation
      const provider = await getActiveAIProvider(user.id);

      if (!provider) {
        return NextResponse.json(
          { error: "ไม่พบ AI Provider ที่เปิดใช้งาน" },
          { status: 400 }
        );
      }

      evaluation = await evaluateRuleWithAI(rule, campaignData, provider);
    } else {
      // Simple evaluation without AI
      evaluation = evaluateRuleSimple(rule, campaignData);
    }

    return NextResponse.json({
      success: true,
      rule: {
        id: rule.id,
        name: rule.name,
        action: rule.action,
      },
      evaluation,
      campaignData: {
        totalCampaigns: campaigns.length,
        totalSpent: campaignData.totalSpent,
        totalConversions: campaignData.totalConversions,
        avgROI: campaignData.roi,
      },
    });
  } catch (error) {
    console.error("Error evaluating ad rule:", error);
    return NextResponse.json(
      { error: "Failed to evaluate ad rule" },
      { status: 500 }
    );
  }
}
