import { NextRequest, NextResponse } from "next/server";
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

async function getOrgIdOrNull(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  return dbUser?.organizationId ?? null;
}

function getLastPathSegment(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["ADMIN", "STOCK"].includes(user.role)) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์จัดการคำขอเบิกงบ" }, { status: 403 });
    }

    const id = getLastPathSegment(request.nextUrl.pathname);
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const orgId = user.organizationId ?? (await getOrgIdOrNull(user.id));
    if (!orgId) return NextResponse.json({ error: "No organization found for this user" }, { status: 403 });

    const body: UpdateBudgetRequestBody = await request.json();

    const existing = await prisma.budgetRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 });

    if (existing.organizationId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // เฉพาะ ADMIN หรือเจ้าของคำขอเท่านั้นที่แก้ได้
    if (existing.requesterId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dataToUpdate: Prisma.BudgetRequestUpdateInput = {};

    if (typeof body.amount === "number") dataToUpdate.amount = body.amount;
    if (typeof body.purpose === "string") dataToUpdate.purpose = body.purpose;
    if (typeof body.reason === "string") dataToUpdate.description = body.reason;
    if (typeof body.reviewNote === "string") dataToUpdate.reviewNote = body.reviewNote;

    if (body.status) {
      dataToUpdate.status = body.status;
      dataToUpdate.reviewedAt = new Date();
      dataToUpdate.reviewedBy = user.id;
    }

    const updated = await prisma.budgetRequest.update({
      where: { id },
      data: dataToUpdate,
    });

    let createdBudget = null;

    // ถ้าจากสถานะเดิมไม่ใช่ APPROVED แล้วเปลี่ยนเป็น APPROVED -> สร้าง Budget ใหม่
    if (existing.status !== "APPROVED" && body.status === "APPROVED") {
      createdBudget = await prisma.budget.create({
        data: {
          name: updated.purpose ? `Budget Request: ${updated.purpose}` : "Budget Request",
          totalAmount: updated.amount,
          remaining: updated.amount,
          description: updated.description ?? undefined,
          organizationId: existing.organizationId,
        },
      });

      await prisma.notification.create({
        data: {
          userId: existing.requesterId,
          type: "BUDGET_APPROVED",
          title: "คำขอเพิ่มงบได้รับการอนุมัติ",
          message: `อนุมัติคำขอเพิ่มงบ "${updated.purpose ?? ""}" จำนวน ${updated.amount.toLocaleString()} บาทแล้ว`,
          link: "/budget-requests",
        },
      });
    }

    return NextResponse.json({ request: updated, budget: createdBudget });
  } catch (error) {
    console.error("Budget request review error:", error);
    return NextResponse.json({ error: "Failed to review budget request" }, { status: 500 });
  }
}
