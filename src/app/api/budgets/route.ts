import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const budgets = await prisma.budget.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
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
    const body = await request.json();
    const budget = await prisma.budget.create({
      data: {
        amount: body.amount,
        purpose: body.purpose,
        spent: body.spent || 0,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        userId: body.userId || "temp-user-id", // TODO: Get from session
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
