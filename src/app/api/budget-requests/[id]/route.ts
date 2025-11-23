import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, isAdmin } from "@/lib/auth";

// GET - Get specific budget request
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "STOCK", "USER"]);

    const budgetRequest = await prisma.budgetRequest.findUnique({
      where: { id: params.id },
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

    if (!budgetRequest) {
      return NextResponse.json(
        { error: "ไม่พบคำขออนุมัติงบประมาณ" },
        { status: 404 }
      );
    }

    // Non-admin users can only see their own requests
    if (!isAdmin(user) && budgetRequest.userId !== user.id) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" },
        { status: 403 }
      );
    }

    return NextResponse.json(budgetRequest);
  } catch (error: any) {
    console.error("Error fetching budget request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch budget request" },
      { status: error.status || 500 }
    );
  }
}

// PATCH - Approve or reject budget request (ADMIN only)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN"]);
    const body = await request.json();
    const { action, reviewNote } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "กรุณาระบุ action ที่ถูกต้อง (approve หรือ reject)" },
        { status: 400 }
      );
    }

    const budgetRequest = await prisma.budgetRequest.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!budgetRequest) {
      return NextResponse.json(
        { error: "ไม่พบคำขออนุมัติงบประมาณ" },
        { status: 404 }
      );
    }

    if (budgetRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "คำขออนุมัติงบประมาณนี้ได้รับการพิจารณาแล้ว" },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    // Update the budget request
    const updated = await prisma.budgetRequest.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNote: reviewNote || null,
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

    // If approved, optionally create a Budget record
    if (action === "approve") {
      const now = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month budget period

      await prisma.budget.create({
        data: {
          userId: budgetRequest.userId,
          amount: budgetRequest.amount,
          purpose: `อนุมัติจากคำขอ: ${budgetRequest.reason}`,
          spent: 0,
          startDate: now,
          endDate: endDate,
        },
      });
    }

    // Notify the requester
    await prisma.notification.create({
      data: {
        userId: budgetRequest.userId,
        type: action === "approve" ? "SUCCESS" : "WARNING",
        title:
          action === "approve"
            ? "คำขออนุมัติงบประมาณได้รับการอนุมัติ"
            : "คำขออนุมัติงบประมาณถูกปฏิเสธ",
        message:
          action === "approve"
            ? `งบประมาณ ฿${budgetRequest.amount.toLocaleString()} ของคุณได้รับการอนุมัติแล้ว`
            : `คำขออนุมัติงบประมาณ ฿${budgetRequest.amount.toLocaleString()} ถูกปฏิเสธ${
                reviewNote ? `: ${reviewNote}` : ""
              }`,
        link: `/budgets`,
        isRead: false,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating budget request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update budget request" },
      { status: error.status || 500 }
    );
  }
}

// DELETE - Delete budget request (Creator or ADMIN only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ADMIN", "STOCK"]);

    const budgetRequest = await prisma.budgetRequest.findUnique({
      where: { id: params.id },
    });

    if (!budgetRequest) {
      return NextResponse.json(
        { error: "ไม่พบคำขออนุมัติงบประมาณ" },
        { status: 404 }
      );
    }

    // Only creator or admin can delete
    if (!isAdmin(user) && budgetRequest.userId !== user.id) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ลบคำขออนุมัตินี้" },
        { status: 403 }
      );
    }

    // Can only delete pending requests
    if (budgetRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "ไม่สามารถลบคำขออนุมัติที่ได้รับการพิจารณาแล้ว" },
        { status: 400 }
      );
    }

    await prisma.budgetRequest.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting budget request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete budget request" },
      { status: error.status || 500 }
    );
  }
}
