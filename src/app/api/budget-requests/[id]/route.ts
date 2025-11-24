import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface UpdateBudgetRequestBody {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  amount?: number;
  purpose?: string;
  reason?: string;
  reviewNote?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UpdateBudgetRequestBody = await request.json();

    const existing = await prisma.budgetRequest.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 });
    }

    if (existing.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dataToUpdate: Prisma.BudgetRequestUpdateInput = {};

    if (typeof body.amount === "number") dataToUpdate.amount = body.amount;
    if (body.purpose) dataToUpdate.purpose = body.purpose;
    if (body.reason) dataToUpdate.reason = body.reason;
    if (body.reviewNote) dataToUpdate.reviewNote = body.reviewNote;

    if (body.status) {
      dataToUpdate.status = body.status;
      dataToUpdate.reviewedAt = new Date();
      dataToUpdate.reviewedBy = user.id;
    }

    const updated = await prisma.budgetRequest.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    let createdBudget = null;

    if (existing.status !== "APPROVED" && body.status === "APPROVED") {
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(now.getMonth() + 1);

      createdBudget = await prisma.budget.create({
        data: {
          amount: updated.amount,
          purpose: updated.purpose,
          spent: 0,
          startDate: now,
          endDate: nextMonth,
          userId: existing.userId,
        },
      });

      await prisma.notification.create({
        data: {
          userId: existing.userId,
          type: "BUDGET_APPROVED",
          title: "คำขอเพิ่มงบได้รับการอนุมัติ",
          message: `อนุมัติคำขอเพิ่มงบ "${updated.purpose}" จำนวน ${updated.amount.toLocaleString()} บาทแล้ว`,
          link: "/budget-requests",
        },
      });
    }

    return NextResponse.json({ request: updated, budget: createdBudget });
  } catch (error) {
    console.error("Budget request review error:", error);
    return NextResponse.json(
      { error: "Failed to review budget request" },
      { status: 500 }
    );
  }
}
