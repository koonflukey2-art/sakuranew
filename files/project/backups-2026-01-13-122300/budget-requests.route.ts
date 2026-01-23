import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface BudgetRequestPayload {
  purpose?: string;
  amount?: number;
  reason?: string;
}

async function getOrgIdOrNull(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  return dbUser?.organizationId ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["ADMIN", "STOCK"].includes(user.role)) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์เข้าถึงคำขอเบิกงบ" }, { status: 403 });
    }

    const orgId = await getOrgIdOrNull(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found for this user" }, { status: 403 });

    const whereClause =
      user.role === "ADMIN"
        ? { organizationId: orgId }
        : { organizationId: orgId, requesterId: user.id };

    const requests = await prisma.budgetRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: { requester: { select: { name: true, email: true } } },
    });

    const reviewerIds = requests.map((r) => r.reviewedBy).filter((id): id is string => Boolean(id));

    const reviewers =
      reviewerIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: reviewerIds } },
            select: { id: true, name: true, email: true },
          })
        : [];

    const reviewerMap = reviewers.reduce<Record<string, { name: string; email: string }>>(
      (acc, reviewer) => {
        acc[reviewer.id] = { name: reviewer.name || "ผู้ตรวจสอบ", email: reviewer.email };
        return acc;
      },
      {}
    );

    const response = requests.map((request) => ({
      id: request.id,
      purpose: request.purpose,
      amount: request.amount,
      reason: request.description || "",
      status: request.status,
      requestedBy: {
        name: request.requester?.name || "User",
        email: request.requester?.email || "",
      },
      createdAt: request.createdAt.toISOString(),
      reviewedAt: request.reviewedAt ? request.reviewedAt.toISOString() : undefined,
      reviewedBy: request.reviewedBy
        ? reviewerMap[request.reviewedBy] || { name: "ผู้ตรวจสอบ", email: "" }
        : undefined,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Budget requests fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch budget requests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["ADMIN", "STOCK"].includes(user.role)) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์สร้างคำขอเบิกงบ" }, { status: 403 });
    }

    const orgId = await getOrgIdOrNull(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found for this user" }, { status: 403 });

    const body: BudgetRequestPayload = await request.json();
    if (!body.purpose || !body.reason || typeof body.amount !== "number") {
      return NextResponse.json({ error: "กรุณาระบุวัตถุประสงค์ จำนวนเงิน และเหตุผล" }, { status: 400 });
    }

    const created = await prisma.budgetRequest.create({
      data: {
        purpose: body.purpose,
        amount: body.amount,
        description: body.reason,
        status: "PENDING",
        organizationId: orgId,
        requesterId: user.id,
      },
    });

    return NextResponse.json({ id: created.id, message: "สร้างคำขอสำเร็จ" }, { status: 201 });
  } catch (error) {
    console.error("Budget request creation error:", error);
    return NextResponse.json({ error: "Failed to create budget request" }, { status: 500 });
  }
}
