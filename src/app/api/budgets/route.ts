import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db"; // ถ้าโปรเจกต์คุณใช้ "@/lib/prisma" ก็เปลี่ยนเป็นอันนั้นได้

// GET /api/budgets
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์เข้าถึงงบประมาณ" },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const budgets = await prisma.budget.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error("Failed to fetch budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

// POST /api/budgets
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์จัดการงบประมาณ" },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const totalAmount = Number(body.totalAmount);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json(
        { error: "totalAmount ต้องเป็นตัวเลขมากกว่า 0" },
        { status: 400 }
      );
    }

    const items = Array.isArray(body.items) ? body.items : [];
    const validItems = items
      .map((item) => ({
        name: typeof item?.name === "string" ? item.name.trim() : "",
        amount: Number(item?.amount),
        quantity: Number(item?.quantity) || 1,
        notes: typeof item?.notes === "string" ? item.notes.trim() : "",
      }))
      .filter((item) => item.name && Number.isFinite(item.amount) && item.amount >= 0);

    const budget = await prisma.budget.create({
      data: {
        name: typeof body.name === "string" ? body.name.trim() : null,
        description:
          typeof body.description === "string" ? body.description.trim() : null,
        totalAmount,
        remaining: totalAmount,
        organizationId: user.organizationId, // ✅ ใช้ org แทน user
        ...(validItems.length > 0
          ? {
              items: {
                create: validItems.map((item) => ({
                  name: item.name,
                  amount: item.amount,
                  quantity: item.quantity,
                  notes: item.notes || null,
                })),
              },
            }
          : {}),
      },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Failed to create budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}

// PUT /api/budgets
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์แก้ไขงบประมาณ" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const totalAmount =
      body.totalAmount !== undefined ? Number(body.totalAmount) : undefined;
    if (
      totalAmount !== undefined &&
      (!Number.isFinite(totalAmount) || totalAmount <= 0)
    ) {
      return NextResponse.json(
        { error: "totalAmount ต้องเป็นตัวเลขมากกว่า 0" },
        { status: 400 }
      );
    }

    const budget = await prisma.budget.update({
      where: { id: body.id },
      data: {
        name: typeof body.name === "string" ? body.name.trim() : undefined,
        description:
          typeof body.description === "string"
            ? body.description.trim()
            : undefined,
        ...(totalAmount !== undefined
          ? {
              totalAmount,
              remaining: totalAmount,
            }
          : {}),
      },
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Failed to update budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}

// DELETE /api/budgets?id=...
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ลบงบประมาณ" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete budget:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
}
