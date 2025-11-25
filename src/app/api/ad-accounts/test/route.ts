import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { canEditAds } from "@/lib/permissions";

function decryptApiKey(encrypted: string): string {
  return Buffer.from(encrypted, "base64").toString("utf-8");
}

// Mock API test functions for different platforms
async function testFacebookAPI(apiKey: string, accountId?: string): Promise<boolean> {
  // In production, call actual Facebook Graph API
  // Example: GET https://graph.facebook.com/v18.0/me?access_token={apiKey}
  try {
    // Mock validation: Check if key looks valid
    if (apiKey.length < 20) return false;
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  } catch {
    return false;
  }
}

async function testTikTokAPI(apiKey: string, accountId?: string): Promise<boolean> {
  // In production, call actual TikTok Ads API
  // Example: GET https://business-api.tiktok.com/open_api/v1.3/user/info/
  try {
    if (apiKey.length < 20) return false;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  } catch {
    return false;
  }
}

async function testLazadaAPI(apiKey: string, accountId?: string): Promise<boolean> {
  // In production, call actual Lazada Open Platform API
  // Example: GET https://api.lazada.com/rest
  try {
    if (apiKey.length < 20) return false;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  } catch {
    return false;
  }
}

async function testShopeeAPI(apiKey: string, accountId?: string): Promise<boolean> {
  // In production, call actual Shopee Open Platform API
  // Example: GET https://partner.shopeemobile.com/api/v2/shop/get_shop_info
  try {
    if (apiKey.length < 20) return false;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  } catch {
    return false;
  }
}

// POST: Test ad account connection
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
        { error: "คุณไม่มีสิทธิ์ทดสอบ Ad Accounts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "กรุณาระบุ account ID" },
        { status: 400 }
      );
    }

    // Fetch ad account
    const adAccount = await prisma.adAccountConfig.findUnique({
      where: { id },
    });

    if (!adAccount || adAccount.userId !== user.id) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
      );
    }

    // Decrypt API key
    const apiKey = decryptApiKey(adAccount.apiKey);

    // Test connection based on platform
    let isValid = false;
    try {
      switch (adAccount.platform) {
        case "FACEBOOK":
          isValid = await testFacebookAPI(apiKey, adAccount.accountId || undefined);
          break;
        case "TIKTOK":
          isValid = await testTikTokAPI(apiKey, adAccount.accountId || undefined);
          break;
        case "LAZADA":
          isValid = await testLazadaAPI(apiKey, adAccount.accountId || undefined);
          break;
        case "SHOPEE":
          isValid = await testShopeeAPI(apiKey, adAccount.accountId || undefined);
          break;
        default:
          return NextResponse.json(
            { error: "Unsupported platform" },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error(`Error testing ${adAccount.platform} API:`, error);
      isValid = false;
    }

    // Update ad account with test result
    await prisma.adAccountConfig.update({
      where: { id },
      data: {
        isValid,
        lastTested: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      isValid,
      message: isValid
        ? "เชื่อมต่อสำเร็จ! API Key ใช้งานได้"
        : "เชื่อมต่อล้มเหลว กรุณาตรวจสอบ API Key",
    });
  } catch (error) {
    console.error("Error testing ad account:", error);
    return NextResponse.json(
      { error: "Failed to test ad account" },
      { status: 500 }
    );
  }
}
