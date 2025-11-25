import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { canEditAds } from "@/lib/permissions";

// Encryption functions (basic implementation)
function encryptApiKey(apiKey: string): string {
  // In production, use proper encryption like crypto.createCipher
  return Buffer.from(apiKey).toString("base64");
}

function decryptApiKey(encrypted: string): string {
  // In production, use proper decryption
  return Buffer.from(encrypted, "base64").toString("utf-8");
}

// GET: Fetch all ad accounts for current user
export async function GET(request: NextRequest) {
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
        { error: "คุณไม่มีสิทธิ์จัดการ Ad Accounts" },
        { status: 403 }
      );
    }

    const adAccounts = await prisma.adAccountConfig.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Decrypt API keys for frontend display (masked)
    const accountsWithMaskedKeys = adAccounts.map((account) => ({
      ...account,
      apiKey: "***" + decryptApiKey(account.apiKey).slice(-4), // Show only last 4 chars
      apiKeyFull: decryptApiKey(account.apiKey), // Include full key for editing
    }));

    return NextResponse.json(accountsWithMaskedKeys);
  } catch (error) {
    console.error("Error fetching ad accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch ad accounts" },
      { status: 500 }
    );
  }
}

// POST: Create new ad account
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
        { error: "คุณไม่มีสิทธิ์จัดการ Ad Accounts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { platform, apiKey, accountId } = body;

    if (!platform || !apiKey) {
      return NextResponse.json(
        { error: "กรุณาระบุ platform และ API key" },
        { status: 400 }
      );
    }

    // Check if account already exists
    const existing = await prisma.adAccountConfig.findUnique({
      where: {
        userId_platform: {
          userId: user.id,
          platform: platform,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ad account สำหรับ platform นี้มีอยู่แล้ว" },
        { status: 400 }
      );
    }

    // Encrypt API key before storing
    const encryptedKey = encryptApiKey(apiKey);

    const adAccount = await prisma.adAccountConfig.create({
      data: {
        userId: user.id,
        platform,
        apiKey: encryptedKey,
        accountId: accountId || null,
        isActive: true,
        isValid: false, // Will be validated by test endpoint
      },
    });

    return NextResponse.json({
      ...adAccount,
      apiKey: "***" + apiKey.slice(-4),
    });
  } catch (error) {
    console.error("Error creating ad account:", error);
    return NextResponse.json(
      { error: "Failed to create ad account" },
      { status: 500 }
    );
  }
}

// PUT: Update ad account
export async function PUT(request: NextRequest) {
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
        { error: "คุณไม่มีสิทธิ์จัดการ Ad Accounts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, apiKey, accountId, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "กรุณาระบุ account ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.adAccountConfig.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (apiKey) updateData.apiKey = encryptApiKey(apiKey);
    if (accountId !== undefined) updateData.accountId = accountId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.adAccountConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...updated,
      apiKey: apiKey ? "***" + apiKey.slice(-4) : "***" + decryptApiKey(updated.apiKey).slice(-4),
    });
  } catch (error) {
    console.error("Error updating ad account:", error);
    return NextResponse.json(
      { error: "Failed to update ad account" },
      { status: 500 }
    );
  }
}

// DELETE: Delete ad account
export async function DELETE(request: NextRequest) {
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
        { error: "คุณไม่มีสิทธิ์จัดการ Ad Accounts" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "กรุณาระบุ account ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.adAccountConfig.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
      );
    }

    await prisma.adAccountConfig.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ad account:", error);
    return NextResponse.json(
      { error: "Failed to delete ad account" },
      { status: 500 }
    );
  }
}
