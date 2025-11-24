import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface BudgetRequestPayload {
  purpose?: string;
  amount?: number;
  reason?: string;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const whereClause = user.role === "ADMIN" ? {} : { userId: user.id };
    const requests = await prisma.budgetRequest.findMany({
      where: whereClause,
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

    const reviewerIds = requests
      .map((req) => req.reviewedBy)
      .filter((id): id is string => Boolean(id));

    const reviewers = await prisma.user.findMany({
      where: { id: { in: reviewerIds } },
      select: { id: true, name: true, email: true },
    });

    const reviewerMap = reviewers.reduce<Record<string, { name: string; email: string }>>(
      (acc, reviewer) => {
        acc[reviewer.id] = {
          name: reviewer.name || "ผู้ตรวจสอบ",
          email: reviewer.email,
        };
        return acc;
      },
      {}
    );

    const response = requests.map((request) => ({
      id: request.id,
      purpose: request.purpose,
      amount: request.amount,
      reason: request.reason,
      status: request.status,
      requestedBy: {
        name: request.user?.name || "User",
        email: request.user?.email || "",
      },
      createdAt: request.createdAt,
      reviewedAt: request.reviewedAt,
      reviewedBy: request.reviewedBy
        ? reviewerMap[request.reviewedBy]
        : undefined,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Budget requests fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: BudgetRequestPayload = await request.json();

    if (!body.purpose || !body.reason || typeof body.amount !== "number") {
      return NextResponse.json(
        { error: "กรุณาระบุวัตถุประสงค์ จำนวนเงิน และเหตุผล" },
        { status: 400 }
      );
    }

    const created = await prisma.budgetRequest.create({
      data: {
        purpose: body.purpose,
        amount: body.amount,
        reason: body.reason,
        userId: user.id,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Budget request creation error:", error);
    return NextResponse.json(
      { error: "Failed to create budget request" },
      { status: 500 }
    );
  }
}
