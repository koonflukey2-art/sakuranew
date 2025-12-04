import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, getCurrentUser } from "@/lib/auth";

export async function GET() {
  // Only ADMIN can view users
  try {
    await requireRole(["ADMIN"]);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unauthorized" },
      { status: error.status || 401 }
    );
  }
  try {
    // Get current user to find their organization
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.organizationId) {
      return NextResponse.json([]);
    }

    // Only show users in same organization
    const users = await prisma.user.findMany({
      where: { organizationId: currentUser.organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, role } = body;

    if (!id || !role) {
      return NextResponse.json(
        { error: "ID and role are required" },
        { status: 400 }
      );
    }

    // Only ADMIN can update user roles
    try {
      await requireRole(["ADMIN"]);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Unauthorized" },
        { status: error.status || 401 }
      );
    }

    // Validate role
    if (!["EMPLOYEE", "STOCK", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to update user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  // Only ADMIN can delete users
  try {
    await requireRole(["ADMIN"]);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unauthorized" },
      { status: error.status || 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // Check if user exists and is not an admin
    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Cannot delete admin users" },
        { status: 403 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
