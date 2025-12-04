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
      return NextResponse.json(
        { error: "No organization found for this user" },
        { status: 403 }
      );
    }

    // ADMIN เห็นทุกคำขอใน org, คนอื่นเห็นเฉพาะที่ตัวเองขอ
    const whereClause =
      user.role === "ADMIN"
        ? { organizationId: user.organizationId }
        : {
            organizationId: user.organizationId,
            requesterId: user.id,
          };

    const requests = await prisma.budgetRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        requester: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // รวบรวม reviewerIds ทั้งหมด (user.id ที่เคยอนุมัติ/รีเจ็ค)
    const reviewerIds = requests
      .map((req) => req.reviewedBy)
      .filter((id): id is string => Boolean(id));

    const reviewers =
      reviewerIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: reviewerIds } },
            select: { id: true, name: true, email: true },
          })
        : [];

    const reviewerMap = reviewers.reduce<
      Record<string, { name: string; email: string }>
    >((acc, reviewer) => {
      acc[reviewer.id] = {
        name: reviewer.name || "ผู้ตรวจสอบ",
        email: reviewer.email,
      };
      return acc;
    }, {});

    // map ให้ตรงกับ interface ที่หน้า React ใช้
    const response = requests.map((request) => ({
      id: request.id,
      purpose: request.purpose,
      amount: request.amount,
      // description ใน DB -> reason ใน frontend
      reason: request.description || "",
      status: request.status,
      requestedBy: {
        name: request.requester?.name || "User",
        email: request.requester?.email || "",
      },
      createdAt: request.createdAt.toISOString(),
      reviewedAt: request.reviewedAt
        ? request.reviewedAt.toISOString()
        : undefined,
      reviewedBy: request.reviewedBy
        ? reviewerMap[request.reviewedBy] || {
            name: "ผู้ตรวจสอบ",
            email: "",
          }
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
        { error: "No organization found for this user" },
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
        // reason จาก frontend -> description ใน DB
        description: body.reason,
        status: "PENDING",
        organizationId: user.organizationId,
        requesterId: user.id,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        message: "สร้างคำขอสำเร็จ",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Budget request creation error:", error);
    return NextResponse.json(
      { error: "Failed to create budget request" },
      { status: 500 }
    );
  }
}
