import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/organization";

export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      // No organization yet - return empty array
      return NextResponse.json([]);
    }

    const budgets = await prisma.budget.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
      },
    });
    return NextResponse.json(budgets);
  } catch (error) {
    console.error("Failed to fetch budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Get current Clerk user
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found. Please contact support." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const budget = await prisma.budget.create({
      data: {
        amount: parseFloat(body.amount) || 0,
        purpose: body.purpose,
        spent: parseFloat(body.spent) || 0,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        organizationId: orgId, // Use organization ID
      },
    });
    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Failed to create budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // Get current Clerk user
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const body = await request.json();

    // Verify budget belongs to organization
    const existing = await prisma.budget.findUnique({
      where: { id: body.id },
    });

    if (!existing || existing.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Budget not found or access denied" },
        { status: 404 }
      );
    }

    const budget = await prisma.budget.update({
      where: { id: body.id },
      data: {
        purpose: body.purpose,
        amount: parseFloat(body.amount) || 0,
        spent: parseFloat(body.spent) || 0,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      },
    });
    return NextResponse.json(budget);
  } catch (error) {
    console.error("Failed to update budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // Get current Clerk user
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // Verify budget belongs to organization
    const budget = await prisma.budget.findUnique({
      where: { id },
    });

    if (!budget || budget.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Budget not found or access denied" },
        { status: 404 }
      );
    }

    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete budget:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
}
