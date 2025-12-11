import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";

export const runtime = "nodejs";

// Mask sensitive tokens for security
function maskToken(token: string | null | undefined): string | null {
  if (!token || token.length < 10) return null;
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    let settings = await prisma.systemSettings.findUnique({
      where: { organizationId: orgId },
    });

    if (!settings) {
      // Create default settings
      settings = await prisma.systemSettings.create({
        data: {
          organizationId: orgId,
          dailyCutOffHour: 23,
          dailyCutOffMinute: 59,
          notifyOnOrder: true,
          notifyOnLowStock: true,
          notifyDailySummary: true,
        },
      });
    }

    // Return with masked tokens
    const safeSettings = {
      ...settings,
      lineNotifyToken: maskToken(settings.lineNotifyToken),
      lineChannelAccessToken: maskToken(settings.lineChannelAccessToken),
      lineChannelSecret: maskToken(settings.lineChannelSecret),
    };

    return NextResponse.json(safeSettings);
  } catch (error: any) {
    console.error("GET system settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only ADMIN can modify settings" },
        { status: 403 }
      );
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await request.json();

    // Build update data object
    const updateData: any = {};

    // Daily cut-off settings
    if (body.dailyCutOffHour !== undefined) {
      updateData.dailyCutOffHour = parseInt(body.dailyCutOffHour);
    }
    if (body.dailyCutOffMinute !== undefined) {
      updateData.dailyCutOffMinute = parseInt(body.dailyCutOffMinute);
    }

    // LINE settings
    if (body.lineWebhookUrl !== undefined) {
      updateData.lineWebhookUrl = body.lineWebhookUrl;
    }

    // Only update tokens if new values provided
    if (typeof body.lineNotifyToken === "string" && body.lineNotifyToken.trim()) {
      updateData.lineNotifyToken = body.lineNotifyToken.trim();
    }
    if (
      typeof body.lineChannelAccessToken === "string" &&
      body.lineChannelAccessToken.trim()
    ) {
      updateData.lineChannelAccessToken = body.lineChannelAccessToken.trim();
    }
    if (
      typeof body.lineChannelSecret === "string" &&
      body.lineChannelSecret.trim()
    ) {
      updateData.lineChannelSecret = body.lineChannelSecret.trim();
    }

    // Notification settings
    if (body.notifyOnOrder !== undefined) {
      updateData.notifyOnOrder = body.notifyOnOrder;
    }
    if (body.notifyOnLowStock !== undefined) {
      updateData.notifyOnLowStock = body.notifyOnLowStock;
    }
    if (body.notifyDailySummary !== undefined) {
      updateData.notifyDailySummary = body.notifyDailySummary;
    }

    // Admin settings
    if (body.adminEmails !== undefined) {
      updateData.adminEmails = body.adminEmails;
    }

    // Upsert settings
    const settings = await prisma.systemSettings.upsert({
      where: { organizationId: orgId },
      update: updateData,
      create: {
        organizationId: orgId,
        ...updateData,
      },
    });

    // Return with masked tokens
    const safeSettings = {
      ...settings,
      lineNotifyToken: maskToken(settings.lineNotifyToken),
      lineChannelAccessToken: maskToken(settings.lineChannelAccessToken),
      lineChannelSecret: maskToken(settings.lineChannelSecret),
    };

    return NextResponse.json(safeSettings);
  } catch (error: any) {
    console.error("POST system settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}