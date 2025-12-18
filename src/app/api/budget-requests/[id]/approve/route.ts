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

    if (!user.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    // Get budget request with items
    const budgetRequest = await prisma.budgetRequest.findUnique({
      where: { id: params.id },
      include: { items: true },
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

    // Create Budget in capital-budget with items
    const budget = await prisma.budget.create({
      data: {
        organizationId: user.organizationId,
        name: `${budgetRequest.title} (อนุมัติจากคำขอ)`,
        description: budgetRequest.description || budgetRequest.reason || "",
        totalAmount: budgetRequest.amount,
        remaining: budgetRequest.amount,
        items: {
          create: budgetRequest.items.map((item) => ({
            name: item.name,
            amount: item.amount,
            quantity: item.quantity,
            notes: item.notes || "",
          })),
        },
      },
    });

    // Update request status
    await prisma.budgetRequest.update({
      where: { id: params.id },
      data: {
        status: "APPROVED",
        approvedBy: user.id,
        reviewedBy: user.id,
        approvedAt: new Date(),
        reviewedAt: new Date(),
        budgetId: budget.id,
      },
    });

    // Create notification for requester
    try {
      await prisma.notification.create({
        data: {
          userId: budgetRequest.requesterId,
          type: "BUDGET_APPROVED",
          title: "✅ คำขอได้รับการอนุมัติ",
          message: `คำขอ "${budgetRequest.title}" จำนวน ฿${budgetRequest.amount.toLocaleString()} ได้รับการอนุมัติแล้ว`,
          link: "/budget-requests",
        },
      });
    } catch (notificationError) {
      console.error("Failed to create notification:", notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      budget,
      message: "อนุมัติคำขอและสร้างงบประมาณเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("Failed to approve budget request:", error);
    return NextResponse.json(
      { error: "Failed to approve request" },
      { status: 500 }
    );
  }
}
