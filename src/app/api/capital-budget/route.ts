import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getOrganizationId } from "@/lib/organization";
import { checkPermission } from "@/lib/permissions";

// GET: Get current capital budget
export async function GET(request: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const budget = await prisma.capitalBudget.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(budget || { amount: 0, remaining: 0, minThreshold: 5000 });
  } catch (error: any) {
    console.error("GET /api/capital-budget error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch capital budget" },
      { status: 500 }
    );
  }
}

// POST: Add capital budget (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ADMIN permission
    const hasPermission = await checkPermission(clerkUser.id, "ADMIN");
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Only ADMIN can add capital budget" },
        { status: 403 }
      );
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await request.json();
    const { amount, description } = body;

    // Get current budget
    let budget = await prisma.capitalBudget.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    if (!budget) {
      // Create new budget
      budget = await prisma.capitalBudget.create({
        data: {
          amount: parseFloat(amount),
          remaining: parseFloat(amount),
          organizationId: orgId,
          createdBy: clerkUser.id,
          description,
        },
      });
    } else {
      // Update existing budget
      budget = await prisma.capitalBudget.update({
        where: { id: budget.id },
        data: {
          amount: { increment: parseFloat(amount) },
          remaining: { increment: parseFloat(amount) },
        },
      });
    }

    // Create transaction record
    await prisma.capitalBudgetTransaction.create({
      data: {
        budgetId: budget.id,
        type: "ADD",
        amount: parseFloat(amount),
        description: description || "เพิ่มงบประมาณ",
        createdBy: clerkUser.id,
        organizationId: orgId,
      },
    });

    return NextResponse.json(budget);
  } catch (error: any) {
    console.error("POST /api/capital-budget error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add capital budget" },
      { status: 500 }
    );
  }
}

// PUT: Update budget threshold (ADMIN only)
export async function PUT(request: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = await checkPermission(clerkUser.id, "ADMIN");
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Only ADMIN can update capital budget" },
        { status: 403 }
      );
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await request.json();
    const { minThreshold } = body;

    const budget = await prisma.capitalBudget.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    const updated = await prisma.capitalBudget.update({
      where: { id: budget.id },
      data: { minThreshold: parseFloat(minThreshold) },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/capital-budget error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update capital budget" },
      { status: 500 }
    );
  }
}
