import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface BudgetRequestPayload {
  title?: string;
  purpose?: string;
  amount?: number;
  reason?: string;
  description?: string;
  items?: Array<{
    name: string;
    amount: number;
    quantity: number;
    notes?: string;
  }>;
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

    // ADMIN sees all, others see only their own
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
        items: true,
      },
    });

    // Map to frontend format
    const response = requests.map((request) => ({
      id: request.id,
      title: request.title || request.purpose,
      description: request.description || "",
      amount: request.amount,
      reason: request.reason || "",
      requesterName: request.requesterName,
      status: request.status,
      items: request.items.map((item) => ({
        name: item.name,
        amount: item.amount,
        quantity: item.quantity,
        notes: item.notes || "",
      })),
      createdAt: request.createdAt.toISOString(),
      approvedAt: request.approvedAt?.toISOString(),
      rejectedReason: request.rejectedReason || undefined,
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

    if (!body.title || !body.reason || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "กรุณาระบุหัวข้อ เหตุผล และรายการอย่างน้อย 1 รายการ" },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = body.items.reduce(
      (sum, item) => sum + item.amount * item.quantity,
      0
    );

    const created = await prisma.budgetRequest.create({
      data: {
        title: body.title,
        purpose: body.title, // Backward compatibility
        amount: totalAmount,
        description: body.description || "",
        reason: body.reason || "",
        status: "PENDING",
        organizationId: user.organizationId,
        requesterId: user.id,
        requesterName: user.name || user.email,
        items: {
          create: body.items.map((item) => ({
            name: item.name,
            amount: item.amount,
            quantity: item.quantity,
            notes: item.notes || "",
          })),
        },
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
