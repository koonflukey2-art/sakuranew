import { NextRequest, NextResponse } from "next/server";
import { getUserRole, getRolePermissions } from "@/lib/rbac";

/**
 * API Route: Check Permission for Specific Page
 * Used by client components to verify access to specific pages
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");

    if (!page) {
      return NextResponse.json(
        { error: "Missing page parameter" },
        { status: 400 }
      );
    }

    const role = await getUserRole();
    const permissions = getRolePermissions(role);

    // Map page names to permission checks
    const permissionMap: Record<string, boolean> = {
      dashboard: permissions.canAccessDashboard,
      stock: permissions.canAccessStock,
      budget: permissions.canAccessBudget,
      "budget-requests": permissions.canAccessBudgetRequests,
      analytics: permissions.canAccessAnalytics,
      "ai-chat": permissions.canAccessAI,
      "ai-assistant": permissions.canAccessAI,
      "ai-dashboard": permissions.canAccessAI,
      settings: permissions.canAccessSettings,
      automation: permissions.canAccessAutomation,
      workflows: permissions.canAccessWorkflows,
      ads: permissions.canAccessAds,
      reports: permissions.canAccessReports,
      profit: permissions.canAccessProfit,
      metrics: permissions.canAccessMetrics,
      users: permissions.canAccessUsers,
      notifications: permissions.canAccessNotifications,
    };

    const hasAccess = permissionMap[page] ?? false;

    return NextResponse.json({
      hasAccess,
      role,
      page,
    });
  } catch (error) {
    console.error("Error checking permission:", error);
    return NextResponse.json(
      { error: "Failed to check permission", hasAccess: false },
      { status: 500 }
    );
  }
}
