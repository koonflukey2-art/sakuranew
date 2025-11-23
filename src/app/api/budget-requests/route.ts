import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, isAdmin, UserRole } from "@/lib/auth";

// GET - List budget requests (with role-based filtering)
export async function GET(request: Request) {
  try {
    const user = await requireAuth();

    // ADMIN can see all requests, STOCK/USER can see only their own
    const where = isAdmin(user)
      ? {}
      : { userId: user.id };

    const requests = await prisma.budgetRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error("Error fetching budget requests:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch budget requests" },
      { status: error.status || 500 }
    );
  }
}

// POST - Create a budget request (STOCK or ADMIN only)
export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    // Only STOCK and ADMIN can create budget requests
    if (user.role === "USER") {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ขออนุมัติงบประมาณ" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { amount, reason } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "กรุณาระบุจำนวนเงินที่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "กรุณาระบุเหตุผลในการขออนุมัติ" },
        { status: 400 }
      );
    }

    // Create the budget request
    const budgetRequest = await prisma.budgetRequest.create({
      data: {
        userId: user.id,
        amount: parseFloat(amount),
        reason: reason.trim(),
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Create notifications for all ADMIN users
    const adminUsers = await prisma.user.findMany({
      where: {
        role: "ADMIN",
      },
      select: {
        id: true,
      },
    });

    const notifications = adminUsers.map((admin) => ({
      userId: admin.id,
      type: "BUDGET_REQUEST" as const,
      title: "คำขออนุมัติงบประมาณใหม่",
      message: `${user.name || user.email} ขออนุมัติงบประมาณ ฿${amount.toLocaleString()} - ${reason}`,
      link: `/budget-requests/${budgetRequest.id}`,
      isRead: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    return NextResponse.json(budgetRequest, { status: 201 });
  } catch (error: any) {
    console.error("Error creating budget request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create budget request" },
      { status: error.status || 500 }
    );
  }
}
