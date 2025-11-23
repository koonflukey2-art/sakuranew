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
}

/**
 * Get current authenticated user with role information
 * @returns User object or null if not authenticated
 */
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
      },
    });

    if (!user) {
      return null;
    }

    // Map old role names for compatibility
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

/**
 * Require authentication and return user or throw 401
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Check if current user has one of the required roles
 * @param allowedRoles Array of allowed roles
 * @returns User object if authorized
 * @throws Error with 403 status if not authorized
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    const error = new Error("Forbidden: Insufficient permissions") as Error & { status: number };
    error.status = 403;
    throw error;
  }

  return user;
}

/**
 * Check if user has specific role
 */
export function hasRole(user: AuthUser, roles: UserRole | UserRole[]): boolean {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.includes(user.role);
}

/**
 * Check if user is admin
 */
export function isAdmin(user: AuthUser): boolean {
  return user.role === "ADMIN";
}

/**
 * Check if user is stock staff
 */
export function isStock(user: AuthUser): boolean {
  return user.role === "STOCK";
}

/**
 * Check if user is employee (read-only access)
 */
export function isEmployee(user: AuthUser): boolean {
  return user.role === "EMPLOYEE";
}

/**
 * Check if user can edit (ADMIN or STOCK for product-related operations)
 */
export function canEdit(user: AuthUser, resourceType?: string): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "STOCK" && resourceType === "product") return true;
  return false;
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message = "Forbidden: Insufficient permissions") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * API route wrapper that requires authentication
 */
export function withAuth(
  handler: (request: Request, user: AuthUser, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: Request, ...args: any[]) => {
    try {
      const user = await requireAuth();
      return await handler(request, user, ...args);
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        return unauthorizedResponse();
      }
      throw error;
    }
  };
}

/**
 * API route wrapper that requires specific roles
 */
export function withRole(
  allowedRoles: UserRole[],
  handler: (request: Request, user: AuthUser, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: Request, ...args: any[]) => {
    try {
      const user = await requireRole(allowedRoles);
      return await handler(request, user, ...args);
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        return unauthorizedResponse();
      }
      if (error.status === 403 || error.message.includes("Forbidden")) {
        return forbiddenResponse();
      }
      throw error;
    }
  };
}
