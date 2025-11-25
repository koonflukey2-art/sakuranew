import { Role } from "@prisma/client";

/**
 * Permission Helper Functions
 *
 * Role hierarchy:
 * - ADMIN: Full access to everything
 * - STOCK: Can manage stock/products only
 * - EMPLOYEE: Read-only access
 */

export function canEditStock(role: Role): boolean {
  return role === "ADMIN" || role === "STOCK";
}

export function canEditBudget(role: Role): boolean {
  return role === "ADMIN";
}

export function canEditAds(role: Role): boolean {
  return role === "ADMIN";
}

export function canEditCampaigns(role: Role): boolean {
  return role === "ADMIN";
}

export function canEditUsers(role: Role): boolean {
  return role === "ADMIN";
}

export function canViewAnalytics(role: Role): boolean {
  return true; // All roles can view analytics
}

export function canCreateBudgetRequest(role: Role): boolean {
  return role === "STOCK" || role === "ADMIN";
}

export function canApproveBudgetRequest(role: Role): boolean {
  return role === "ADMIN";
}

export function isReadOnly(role: Role): boolean {
  return role === "EMPLOYEE";
}

export function isAdmin(role: Role): boolean {
  return role === "ADMIN";
}

export function isStockManager(role: Role): boolean {
  return role === "STOCK";
}

export function isEmployee(role: Role): boolean {
  return role === "EMPLOYEE";
}

/**
 * Get permission error message based on role
 */
export function getPermissionError(role: Role): string {
  if (role === "EMPLOYEE") {
    return "คุณไม่มีสิทธิ์ในการแก้ไขข้อมูล (Read-only access)";
  }
  if (role === "STOCK") {
    return "คุณมีสิทธิ์จัดการเฉพาะส่วนของสต็อกเท่านั้น";
  }
  return "คุณไม่มีสิทธิ์ในการดำเนินการนี้";
}

/**
 * Check if user can access a specific resource
 */
export function canAccessResource(role: Role, resource: string): boolean {
  const adminOnly = ["users", "settings", "ads", "campaigns", "budget"];
  const stockAccess = ["stock", "products"];
  const allAccess = ["analytics", "dashboard", "notifications"];

  if (role === "ADMIN") return true;

  if (role === "STOCK") {
    return stockAccess.includes(resource) || allAccess.includes(resource);
  }

  // EMPLOYEE - read-only access to non-sensitive pages
  return allAccess.includes(resource);
}
