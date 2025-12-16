import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getOrganizationId } from "@/lib/organization";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();

    const budgets = await prisma.budget.findMany({
      where: { organizationId: orgId },
      include: {
        items: true, // Include budget items
      },
      orderBy: { createdAt: "desc" },
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

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    const body = await request.json();

    const { name, description, totalAmount, items } = body;

    // Create budget with items
    const budget = await prisma.budget.create({
      data: {
        organizationId: orgId,
        name: name || "งบประมาณ",
        description: description || "",
        totalAmount: parseFloat(totalAmount),
        remaining: parseFloat(totalAmount),
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            amount: parseFloat(item.amount),
            quantity: parseInt(item.quantity) || 1,
            notes: item.notes || "",
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Failed to create budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}
