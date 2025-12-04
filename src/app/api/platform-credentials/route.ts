import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user || !user.organizationId) {
      return NextResponse.json([]);
    }

    const creds = await prisma.platformCredential.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        platform: true,
        isValid: true,
        lastTested: true,
        testMessage: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(creds);
  } catch (error) {
    console.error("Platform credentials fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch platform credentials" },
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

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      platform,
      apiKey,
      apiSecret,
      accessToken,
      refreshToken,
    } = body;

    if (!platform) {
      return NextResponse.json(
        { error: "Platform is required" },
        { status: 400 }
      );
    }

    const encryptedApiKey = apiKey ? encrypt(apiKey) : null;
    const encryptedApiSecret = apiSecret ? encrypt(apiSecret) : null;
    const encryptedAccessToken = accessToken ? encrypt(accessToken) : null;
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;

    // upsert (1 platform per organization)
    const credential = await prisma.platformCredential.upsert({
      where: {
        organizationId_platform: {
          organizationId: user.organizationId,
          platform,
        },
      },
      create: {
        organizationId: user.organizationId,
        platform,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
      },
      update: {
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        isValid: false,
        lastTested: null,
        testMessage: null,
      },
    });

    return NextResponse.json(credential);
  } catch (error) {
    console.error("Platform credential upsert error:", error);
    return NextResponse.json(
      { error: "Failed to save platform credential" },
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

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Credential ID required" },
        { status: 400 }
      );
    }

    // Verify ownership before deleting
    const credential = await prisma.platformCredential.findUnique({
      where: { id },
    });

    if (!credential || credential.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "Credential not found or access denied" },
        { status: 404 }
      );
    }

    await prisma.platformCredential.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Platform credential deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete platform credential" },
      { status: 500 }
    );
  }
}
