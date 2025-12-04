import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export type UserRole = "ADMIN" | "STOCK" | "EMPLOYEE";

export interface AuthUser {
  id: string;
  clerkId: string | null;
  email: string;
  name: string | null;
  role: UserRole;
  organizationId: string | null; // ✅ เพิ่ม
}

// ...

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        role: true,
        organizationId: true, // ✅ เพิ่ม
      },
    });

    if (!user) {
      return null;
    }

    let role = user.role as UserRole;
    if (user.role === "STOCK_STAFF") role = "STOCK";
    if (user.role === "USER") role = "EMPLOYEE";

    return {
      ...user,
      role,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}
