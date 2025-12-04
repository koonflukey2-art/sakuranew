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

    if (!user.organizationId) {
      return NextResponse.json([]);
    }

    // Filter by organization, optionally by requester for non-admins
    const whereClause =
      user.role === "ADMIN"
        ? { organizationId: user.organizationId }
        : { organizationId: user.organizationId, requesterId: user.id };

    const requests = await prisma.budgetRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    // Fetch requester and reviewer information
    const requesterIds = requests.map((req) => req.requesterId);
    const reviewerIds = requests
      .map((req) => req.reviewedBy)
      .filter((id): id is string => Boolean(id));

    const allUserIds = [...new Set([...requesterIds, ...reviewerIds])];

    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = users.reduce<Record<string, { name: string; email: string }>>(
      (acc, user) => {
        acc[user.id] = {
          name: user.name || "User",
          email: user.email,
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
      requestedBy: userMap[request.requesterId] || { name: "User", email: "" },
      createdAt: request.createdAt,
      reviewedAt: request.reviewedAt,
      reviewedBy: request.reviewedBy
        ? userMap[request.reviewedBy]
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

    if (!user.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
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
        requesterId: user.id,
        organizationId: user.organizationId,
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
