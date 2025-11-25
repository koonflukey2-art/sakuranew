import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET() {
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

    const adAccounts = await prisma.adAccount.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        platform: true,
        accountName: true,
        accountId: true,
        isActive: true,
        isDefault: true,
        isValid: true,
        lastTested: true,
        testMessage: true,
        currency: true,
        timezone: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(adAccounts);
  } catch (error) {
    console.error("Ad accounts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ad accounts" },
      { status: 500 }
    );
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
    const {
      platform,
      accountName,
      accountId,
      apiKey,
      apiSecret,
      accessToken,
      refreshToken,
      currency = "THB",
      timezone = "Asia/Bangkok",
    } = body;

    if (!platform || !accountName || !accountId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existing = await prisma.adAccount.findUnique({
      where: {
        userId_platform_accountId: {
          userId: user.id,
          platform,
          accountId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ad account already exists" },
        { status: 400 }
      );
    }

    const encryptedApiKey = apiKey ? encrypt(apiKey) : "";
    const encryptedApiSecret = apiSecret ? encrypt(apiSecret) : null;
    const encryptedAccessToken = accessToken ? encrypt(accessToken) : null;
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;

    const adAccount = await prisma.adAccount.create({
      data: {
        userId: user.id,
        platform,
        accountName,
        accountId,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        currency,
        timezone,
      },
    });

    return NextResponse.json(adAccount);
  } catch (error) {
    console.error("Ad account creation error:", error);
    return NextResponse.json(
      { error: "Failed to create ad account" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Ad account ID required" },
        { status: 400 }
      );
    }

    await prisma.adAccount.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ad account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete ad account" },
      { status: 500 }
    );
  }
}
