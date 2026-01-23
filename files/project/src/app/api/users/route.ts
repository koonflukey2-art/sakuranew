// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { getOrganizationId } from "@/lib/organization";

/**
 * GET /api/users
 * Fetch all users (ADMIN only)
 */
export async function GET() {
  try {
    const { response } = await requireRole("ADMIN");
    if (response) {
      return response;
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Fetch all users
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { role: "asc" }, // ADMIN first, then STOCK, then EMPLOYEE
        { createdAt: "desc" }, // Newest first within each role
      ],
    });

    return NextResponse.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
