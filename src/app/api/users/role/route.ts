// src/app/api/users/role/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/rbac";
import { requireRole } from "@/lib/auth-guard";

/**
 * PUT /api/users/role
 * Update a user's role (ADMIN only)
 */
export async function PUT(request: Request) {
  try {
    const { response } = await requireRole("ADMIN");
    if (response) {
      return response;
    }

    const body = await request.json();
    const { userId, newRole } = body;

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: "Missing userId or newRole" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: UserRole[] = ["ADMIN", "STOCK", "EMPLOYEE"];
    if (!validRoles.includes(newRole as UserRole)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMIN, STOCK, or EMPLOYEE" },
        { status: 400 }
      );
    }

    // Update user role
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Role updated to ${newRole}`,
      user: updated,
    });
  } catch (error: any) {
    console.error("Error updating user role:", error);
    
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}
