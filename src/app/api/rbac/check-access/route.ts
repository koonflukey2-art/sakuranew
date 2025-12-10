// src/app/api/rbac/check-access/route.ts
import { NextResponse } from "next/server";
import { getUserRole, getRolePermissions } from "@/lib/rbac";

/**
 * GET /api/rbac/check-access
 * Returns the current user's role and permissions
 * Used by client components to check access
 */
export async function GET() {
  try {
    // Get user role from database
    const role = await getUserRole();
    
    // Get permissions for this role
    const permissions = getRolePermissions(role);

    return NextResponse.json({
      success: true,
      role,
      permissions,
    });
  } catch (error) {
    console.error("Error checking access:", error);
    
    // Return default EMPLOYEE permissions on error
    return NextResponse.json(
      {
        success: false,
        role: "EMPLOYEE",
        permissions: {
          canAccessDashboard: true,
          canAccessStock: true,
          canAccessBudget: false,
          canAccessBudgetRequests: true,
          canAccessAnalytics: true,
          canAccessAI: false, // NO AI access for EMPLOYEE
          canAccessSettings: false,
          canAccessAutomation: false,
          canAccessWorkflows: false,
          canAccessAds: false,
          canAccessReports: false,
          canAccessProfit: false,
          canAccessMetrics: false,
          canAccessUsers: false,
          canAccessNotifications: true,
        },
      },
      { status: 200 } // Return 200 even on error to prevent redirects
    );
  }
}