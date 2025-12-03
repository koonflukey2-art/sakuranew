import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getOrganizationId } from "@/lib/organization";

export async function POST(request: Request) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const { token } = await request.json();

    if (!token || token.trim() === "") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Test the token first
    const testResponse = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: new URLSearchParams({
        message: "✅ LINE Notify เชื่อมต่อสำเร็จ!\n\nระบบจะส่งการแจ้งเตือนเมื่อ:\n• สินค้าใกล้หมด\n• งบประมาณเกิน\n• แคมเปญต้องตรวจสอบ",
      }),
    });

    const isValid = testResponse.ok;
    const testMessage = isValid
      ? "Token is valid and test notification sent"
      : "Token is invalid";

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid LINE Notify token" },
        { status: 400 }
      );
    }

    // Save or update LINE token
    const existing = await prisma.platformCredential.findFirst({
      where: {
        organizationId: orgId,
        platform: "LINE_NOTIFY",
      },
    });

    if (existing) {
      await prisma.platformCredential.update({
        where: { id: existing.id },
        data: {
          accessToken: token,
          isValid: true,
          lastTested: new Date(),
          testMessage,
        },
      });
    } else {
      await prisma.platformCredential.create({
        data: {
          organizationId: orgId,
          platform: "LINE_NOTIFY",
          accessToken: token,
          isValid: true,
          lastTested: new Date(),
          testMessage,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "LINE token saved and verified successfully",
    });
  } catch (error: any) {
    console.error("Error saving LINE token:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save token" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const lineCred = await prisma.platformCredential.findFirst({
      where: {
        organizationId: orgId,
        platform: "LINE_NOTIFY",
      },
      select: {
        isValid: true,
        lastTested: true,
        testMessage: true,
      },
    });

    return NextResponse.json({
      hasToken: !!lineCred,
      isValid: lineCred?.isValid || false,
      lastTested: lineCred?.lastTested || null,
      testMessage: lineCred?.testMessage || null,
    });
  } catch (error: any) {
    console.error("Error fetching LINE token:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch token" },
      { status: 500 }
    );
  }
}
