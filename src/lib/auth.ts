import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export type UserRole = "ADMIN" | "STOCK" | "EMPLOYEE";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  organizationId: string | null; // ✅ เพิ่ม
}

// ...

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
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
