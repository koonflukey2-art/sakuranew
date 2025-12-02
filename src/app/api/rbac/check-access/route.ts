import { NextResponse } from "next/server";
import { getUserRole, getRolePermissions } from "@/lib/rbac";

export async function GET() {
  try {
    const role = await getUserRole();
    const permissions = getRolePermissions(role);

    return NextResponse.json({
      role,
      permissions,
      authorized: true,
    });
  } catch (error) {
    console.error("RBAC check error:", error);
    return NextResponse.json(
      {
        authorized: false,
        error: "Failed to check permissions",
      },
      { status: 500 }
    );
  }
}
