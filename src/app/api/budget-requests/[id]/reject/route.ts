import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "กรุณาระบุเหตุผลที่ปฏิเสธ" },
        { status: 400 }
      );
    }

    // Get budget request
    const budgetRequest = await prisma.budgetRequest.findUnique({
      where: { id: params.id },
    });

    if (!budgetRequest) {
      return NextResponse.json(
        { error: "Budget request not found" },
        { status: 404 }
      );
    }

    if (budgetRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Request already processed" },
        { status: 400 }
      );
    }

    // Update request status
    await prisma.budgetRequest.update({
      where: { id: params.id },
      data: {
        status: "REJECTED",
        approvedBy: user.id,
        reviewedBy: user.id,
        approvedAt: new Date(),
        reviewedAt: new Date(),
        rejectedReason: reason,
        reviewNote: reason,
      },
    });

    // Create notification for requester
    try {
      await prisma.notification.create({
        data: {
          userId: budgetRequest.requesterId,
          type: "BUDGET_ALERT",
          title: "❌ คำขอถูกปฏิเสธ",
          message: `คำขอ "${budgetRequest.title}" ถูกปฏิเสธ: ${reason}`,
          link: "/budget-requests",
        },
      });
    } catch (notificationError) {
      console.error("Failed to create notification:", notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: "ปฏิเสธคำขอเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("Failed to reject budget request:", error);
    return NextResponse.json(
      { error: "Failed to reject request" },
      { status: 500 }
    );
  }
}
