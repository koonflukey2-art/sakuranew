import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function getBudgetSummary(organizationId: string) {
  const agg = await prisma.budget.aggregate({
    where: { organizationId },
    _sum: { totalAmount: true, remaining: true },
  });

  const total = agg._sum.totalAmount ?? 0;
  const remaining = agg._sum.remaining ?? 0;
  const used = Math.max(total - remaining, 0);

  return { total, used, remaining };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    if (!["ADMIN", "STOCK"].includes(user.role)) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์เข้าถึงค่าใช้จ่าย" },
        { status: 403 }
      );
    }

    const [summary, expenses] = await Promise.all([
      getBudgetSummary(user.organizationId),
      prisma.expense.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ summary, expenses });
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    if (!["ADMIN", "STOCK"].includes(user.role)) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์บันทึกค่าใช้จ่าย" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const quantity = Number(body.quantity);
    const amount = Number(body.amount);
    const note = typeof body.note === "string" ? body.note.trim() : null;

    if (!name) {
      return NextResponse.json({ error: "กรุณากรอกชื่อค่าใช้จ่าย" }, { status: 400 });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "จำนวนต้องเป็นจำนวนเต็มมากกว่า 0" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "จำนวนเงินต้องมากกว่า 0" }, { status: 400 });
    }

    const totalCost = amount;

    const createdExpense = await prisma.$transaction(async (tx) => {
      const agg = await tx.budget.aggregate({
        where: { organizationId: user.organizationId as string },
        _sum: { remaining: true },
      });

      const available = agg._sum.remaining ?? 0;
      if (available <= 0) {
        throw new Error("NO_BUDGET");
      }

      if (totalCost > available) {
        throw new Error("INSUFFICIENT_BUDGET");
      }

      const expense = await tx.expense.create({
        data: {
          organizationId: user.organizationId as string,
          name,
          quantity,
          amount: totalCost,
          note: note || null,
        },
      });

      let left = totalCost;
      const budgets = await tx.budget.findMany({
        where: { organizationId: user.organizationId as string },
        orderBy: { createdAt: "desc" },
        select: { id: true, remaining: true },
      });

      for (const budget of budgets) {
        if (left <= 0) break;
        const remaining = Number(budget.remaining) || 0;
        if (remaining <= 0) continue;

        const use = Math.min(remaining, left);
        await tx.budget.update({
          where: { id: budget.id },
          data: { remaining: { decrement: use } },
        });

        left -= use;
      }

      if (left > 0) {
        throw new Error("BUDGET_NOT_ENOUGH_AFTER_DEDUCT");
      }

      return expense;
    });

    const summary = await getBudgetSummary(user.organizationId);

    return NextResponse.json({ expense: createdExpense, summary }, { status: 201 });
  } catch (error: any) {
    const message = error?.message;
    if (message === "NO_BUDGET") {
      return NextResponse.json(
        { error: "ไม่พบงบประมาณ กรุณาเพิ่มงบประมาณก่อน" },
        { status: 400 }
      );
    }

    if (
      message === "INSUFFICIENT_BUDGET" ||
      message === "BUDGET_NOT_ENOUGH_AFTER_DEDUCT"
    ) {
      return NextResponse.json({ error: "งบไม่พอ" }, { status: 400 });
    }

    console.error("Failed to create expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
