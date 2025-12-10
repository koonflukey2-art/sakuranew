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

// GET - Fetch system settings
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

    // Get or create default settings
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

    // Mask sensitive tokens when returning to client
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

// POST - Update system settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is ADMIN
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

    // Update or create settings
    const settings = await prisma.systemSettings.upsert({
      where: { organizationId: orgId },
      update: {
        ...(body.dailyCutOffHour !== undefined && {
          dailyCutOffHour: parseInt(body.dailyCutOffHour),
        }),
        ...(body.dailyCutOffMinute !== undefined && {
          dailyCutOffMinute: parseInt(body.dailyCutOffMinute),
        }),
        ...(body.lineNotifyToken !== undefined && {
          lineNotifyToken: body.lineNotifyToken || null,
        }),
        ...(body.lineChannelAccessToken !== undefined && {
          lineChannelAccessToken: body.lineChannelAccessToken || null,
        }),
        ...(body.lineChannelSecret !== undefined && {
          lineChannelSecret: body.lineChannelSecret || null,
        }),
        ...(body.lineWebhookUrl !== undefined && {
          lineWebhookUrl: body.lineWebhookUrl || null,
        }),
        ...(body.adminEmails !== undefined && {
          adminEmails: body.adminEmails || null,
        }),
        ...(body.notifyOnOrder !== undefined && {
          notifyOnOrder: body.notifyOnOrder,
        }),
        ...(body.notifyOnLowStock !== undefined && {
          notifyOnLowStock: body.notifyOnLowStock,
        }),
        ...(body.notifyDailySummary !== undefined && {
          notifyDailySummary: body.notifyDailySummary,
        }),
      },
      create: {
        organizationId: orgId,
        dailyCutOffHour: parseInt(body.dailyCutOffHour) || 23,
        dailyCutOffMinute: parseInt(body.dailyCutOffMinute) || 59,
        lineNotifyToken: body.lineNotifyToken || null,
        lineChannelAccessToken: body.lineChannelAccessToken || null,
        lineChannelSecret: body.lineChannelSecret || null,
        lineWebhookUrl: body.lineWebhookUrl || null,
        adminEmails: body.adminEmails || null,
        notifyOnOrder: body.notifyOnOrder ?? true,
        notifyOnLowStock: body.notifyOnLowStock ?? true,
        notifyDailySummary: body.notifyDailySummary ?? true,
      },
    });

    // Return masked tokens
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
