// src/lib/rbac-core.ts

export type UserRole = "ADMIN" | "STOCK" | "EMPLOYEE";

export interface RolePermissions {
  canAccessDashboard: boolean;
  canAccessStock: boolean;
  canAccessBudget: boolean;
  canAccessBudgetRequests: boolean;
  canAccessAnalytics: boolean;
  canAccessAI: boolean;
  canAccessSettings: boolean;
  canAccessAutomation: boolean;
  canAccessWorkflows: boolean;
  canAccessAds: boolean;
  canAccessReports: boolean;
  canAccessProfit: boolean;
  canAccessMetrics: boolean;
  canAccessUsers: boolean;
  canAccessNotifications: boolean;
}

export function getRolePermissions(role: UserRole): RolePermissions {
  if (role === "ADMIN") {
    return {
      canAccessDashboard: true,
      canAccessStock: true,
      canAccessBudget: true,
      canAccessBudgetRequests: true,
      canAccessAnalytics: true,
      canAccessAI: true,
      canAccessSettings: true,
      canAccessAutomation: true,
      canAccessWorkflows: true,
      canAccessAds: true,
      canAccessReports: true,
      canAccessProfit: true,
      canAccessMetrics: true,
      canAccessUsers: true,
      canAccessNotifications: true,
    };
  }

  if (role === "STOCK") {
    return {
      canAccessDashboard: true,
      canAccessStock: true,
      canAccessBudget: true,
      canAccessBudgetRequests: true,
      canAccessAnalytics: true,
      canAccessAI: true,
      canAccessSettings: false,
      canAccessAutomation: false,
      canAccessWorkflows: false,
      canAccessAds: true,
      canAccessReports: true,
      canAccessProfit: true,
      canAccessMetrics: false,
      canAccessUsers: false,
      canAccessNotifications: true,
    };
  }

  // EMPLOYEE (default)
  return {
    canAccessDashboard: true,
    canAccessStock: true,
    canAccessBudget: false,
    canAccessBudgetRequests: true,
    canAccessAnalytics: true,
    canAccessAI: true,
    canAccessSettings: false,
    canAccessAutomation: false,
    canAccessWorkflows: false,
    canAccessAds: false,
    canAccessReports: false,
    canAccessProfit: false,
    canAccessMetrics: false,
    canAccessUsers: false,
    canAccessNotifications: true,
  };
}

export function hasPermission(
  role: UserRole,
  permission: keyof RolePermissions
): boolean {
  const permissions = getRolePermissions(role);
  return permissions[permission];
}

export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    ADMIN: "ผู้ดูแลระบบ",
    STOCK: "พนักงานสต๊อก",
    EMPLOYEE: "พนักงาน",
  };
  return roleNames[role] || "ไม่ระบุ";
}
