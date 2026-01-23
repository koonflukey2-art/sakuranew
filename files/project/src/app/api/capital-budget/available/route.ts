import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrganizationId } from "@/lib/organization";

export const runtime = "nodejs";

/**
 * GET /api/capital-budget/available
 * Compatibility: ใช้ Budget (ใหม่) แทน CapitalBudget (เก่า)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["ADMIN", "STOCK"].includes(user.role)) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์เข้าถึงงบประมาณคงเหลือ" }, { status: 403 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json(
        { error: "User has no organizationId. Please contact admin or re-register." },
        { status: 400 }
      );
    }

    const budgets = await prisma.budget.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: { totalAmount: true, remaining: true },
    });

    const totalAmount = budgets.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
    const available = budgets.reduce((s, b) => s + (Number(b.remaining) || 0), 0);
    const used = totalAmount - available;

    const minThreshold = 5000;

    return NextResponse.json({
      totalAmount,
      available,
      used,
      budgetCount: budgets.length,
      minThreshold,
      isLow: available <= minThreshold,
      source: "Budget",
    });
  } catch (error) {
    console.error("Failed to get available budget:", error);
    return NextResponse.json({ error: "Failed to get budget" }, { status: 500 });
  }
}
