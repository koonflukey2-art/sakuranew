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

    const { message, title } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get LINE token from organization settings
    const lineCred = await prisma.platformCredential.findFirst({
      where: {
        organizationId: orgId,
        platform: "LINE_NOTIFY",
      },
    });

    if (!lineCred || !lineCred.accessToken) {
      return NextResponse.json(
        { error: "LINE Notify token not configured. Please add it in Settings." },
        { status: 400 }
      );
    }

    // Prepare LINE message
    const lineMessage = title ? `\n${title}\n\n${message}` : message;

    // Send to LINE Notify API
    const response = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${lineCred.accessToken}`,
      },
      body: new URLSearchParams({
        message: lineMessage,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("LINE API error:", error);
      return NextResponse.json(
        { error: "Failed to send LINE notification. Please check your token." },
        { status: 500 }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: "LINE notification sent successfully",
      result,
    });
  } catch (error: any) {
    console.error("Error sending LINE notification:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notification" },
      { status: 500 }
    );
  }
}
