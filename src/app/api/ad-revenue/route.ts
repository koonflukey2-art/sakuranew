import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";
import { getUserRole, getRolePermissions } from "@/lib/rbac";

/**
 * GET /api/ad-revenue
 * Get all ad revenue records for the organization
 * Only accessible to ADMIN and STOCK roles
 */
export async function GET(request: NextRequest) {
  try {
    // Check user role
    const role = await getUserRole();
    const permissions = getRolePermissions(role);

    if (!permissions.canAccessAds && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admin or Stock only." },
        { status: 403 }
      );
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const revenues = await prisma.adRevenue.findMany({
      where: { organizationId: orgId },
      orderBy: { scannedAt: "desc" },
      take: 100, // Limit to last 100 records
    });

    return NextResponse.json(revenues);
  } catch (error: any) {
    console.error("Error fetching ad revenue:", error);
    return NextResponse.json(
      { error: "Failed to fetch ad revenue" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ad-revenue
 * Create a new ad revenue record
 * Only accessible to ADMIN and STOCK roles
 */
export async function POST(request: NextRequest) {
  try {
    // Check user role
    const role = await getUserRole();
    const permissions = getRolePermissions(role);

    if (!permissions.canAccessAds && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admin or Stock only." },
        { status: 403 }
      );
    }

    const user = await currentUser();
    const orgId = await getOrganizationId();

    if (!user || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { platform, amount, qrCodeData, notes } = body;

    // Validate required fields
    if (!platform || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Platform and valid amount are required" },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms = ["FACEBOOK", "TIKTOK", "LAZADA", "SHOPEE"];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform. Must be one of: " + validPlatforms.join(", ") },
        { status: 400 }
      );
    }

    // Create revenue record
    const revenue = await prisma.adRevenue.create({
      data: {
        organizationId: orgId,
        platform,
        amount: parseFloat(amount),
        qrCodeData: qrCodeData || null,
        notes: notes || null,
        scannedBy: user.id,
      },
    });

    return NextResponse.json(revenue, { status: 201 });
  } catch (error: any) {
    console.error("Error creating ad revenue:", error);
    return NextResponse.json(
      { error: "Failed to create ad revenue record" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ad-revenue?id=xxx
 * Delete an ad revenue record
 * Only accessible to ADMIN
 */
export async function DELETE(request: NextRequest) {
  try {
    // Only ADMIN can delete
    const role = await getUserRole();
    if (role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admin only." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    // Verify the record belongs to this organization
    const revenue = await prisma.adRevenue.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!revenue) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Delete the record
    await prisma.adRevenue.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting ad revenue:", error);
    return NextResponse.json(
      { error: "Failed to delete ad revenue record" },
      { status: 500 }
    );
  }
}
