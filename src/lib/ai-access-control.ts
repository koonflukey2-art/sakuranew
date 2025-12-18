// src/lib/ai-access-control.ts
// Server-side AI access control utilities

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

/**
 * Check if the current user can access AI features
 * Returns: { allowed: boolean, reason?: string }
 */
export async function checkAIAccess(): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return { allowed: false, reason: "Not authenticated" };
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    select: { role: true },
  });

  if (!dbUser) {
    return { allowed: false, reason: "User not found in database" };
  }

  // EMPLOYEE role CANNOT use AI
  if (dbUser.role === "EMPLOYEE") {
    return {
      allowed: false,
      reason: "AI features are not available for Employee role. Contact your administrator.",
    };
  }

  // ADMIN and STOCK can use AI
  return { allowed: true };
}

/**
 * Check if the current user can access a specific page
 * Returns: { allowed: boolean, reason?: string }
 */
export async function checkPageAccess(page: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return { allowed: false, reason: "Not authenticated" };
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    select: { role: true },
  });

  if (!dbUser) {
    return { allowed: false, reason: "User not found in database" };
  }

  // System settings - Admin only
  if (page === "system-settings" && dbUser.role !== "ADMIN") {
    return {
      allowed: false,
      reason: "Only Administrators can access System Settings",
    };
  }

  // AI features - No Employees
  if (
    page.includes("ai-") &&
    (dbUser.role === "EMPLOYEE")
  ) {
    return {
      allowed: false,
      reason: "AI features are not available for Employee role",
    };
  }

  return { allowed: true };
}

/**
 * Check if AI can access a specific resource
 * (e.g., prevent AI from accessing system-settings)
 */
export function canAIAccessResource(resourcePath: string): boolean {
  // AI CANNOT access system-settings
  if (resourcePath.includes("system-settings") || resourcePath.includes("/settings")) {
    return false;
  }

  // AI can access everything else
  return true;
}
