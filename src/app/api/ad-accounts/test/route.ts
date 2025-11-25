import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

async function testFacebookConnection(apiKey: string, accountId: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${accountId}?fields=name,account_status&access_token=${apiKey}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Invalid credentials");
    }

    const data = await response.json();
    return {
      success: true,
      message: `Connected to ${data.name}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Connection failed",
    };
  }
}

async function testGoogleAdsConnection(apiKey: string, accountId: string) {
  try {
    const response = await fetch(
      `https://googleads.googleapis.com/v15/customers/${accountId}:listAccessibleCustomers`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Invalid credentials");
    }

    return {
      success: true,
      message: "Successfully connected to Google Ads",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Connection failed",
    };
  }
}

async function testTikTokConnection(apiKey: string) {
  try {
    const response = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/advertiser/info/`,
      {
        method: "GET",
        headers: {
          "Access-Token": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Invalid credentials");
    }

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(data.message || "Connection failed");
    }

    return {
      success: true,
      message: "Successfully connected to TikTok Ads",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Connection failed",
    };
  }
}

async function testLINEConnection(apiKey: string, accountId: string) {
  try {
    const response = await fetch(
      `https://api.line.me/v2/bot/profile/${accountId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Invalid credentials");
    }

    return {
      success: true,
      message: "Successfully connected to LINE",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Connection failed",
    };
  }
}

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
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Ad account ID required" },
        { status: 400 }
      );
    }

    const adAccount = await prisma.adAccount.findUnique({
      where: { id, userId: user.id },
    });

    if (!adAccount) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
      );
    }

    const apiKey = decrypt(adAccount.apiKey);
    const accessToken = adAccount.accessToken
      ? decrypt(adAccount.accessToken)
      : null;

    let result;
    switch (adAccount.platform) {
      case "FACEBOOK":
        result = await testFacebookConnection(
          accessToken || apiKey,
          adAccount.accountId
        );
        break;
      case "GOOGLE":
        result = await testGoogleAdsConnection(
          accessToken || apiKey,
          adAccount.accountId
        );
        break;
      case "TIKTOK":
        result = await testTikTokConnection(apiKey);
        break;
      case "LINE":
        result = await testLINEConnection(apiKey, adAccount.accountId);
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported platform" },
          { status: 400 }
        );
    }

    await prisma.adAccount.update({
      where: { id },
      data: {
        isValid: result.success,
        lastTested: new Date(),
        testMessage: result.message,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Ad account test error:", error);
    return NextResponse.json(
      { error: "Failed to test connection" },
      { status: 500 }
    );
  }
}
