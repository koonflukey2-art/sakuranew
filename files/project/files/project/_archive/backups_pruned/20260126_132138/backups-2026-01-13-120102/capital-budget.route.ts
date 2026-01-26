import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrganizationId } from "@/lib/organization";

export const runtime = "nodejs";

// GET /api/capital-budget  (compat -> Budget list)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "STOCK"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const budgets = await prisma.budget.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        totalAmount: true,
        remaining: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // หน้า capital-budget/page.tsx map จาก { amount, remaining, description, createdAt }
    return NextResponse.json(
      budgets.map((b) => ({
        id: b.id,
        amount: Number(b.totalAmount) || 0,
        remaining: Number(b.remaining) || 0,
        description: b.description ?? b.name ?? "",
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }))
    );
  } catch (e: any) {
    console.error("[capital-budget GET] error:", e);
    return NextResponse.json(
      { error: "Failed to fetch budgets", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

// POST /api/capital-budget  (compat -> Budget create)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "STOCK"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const body = await request.json();
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount ต้องเป็นตัวเลขมากกว่า 0" }, { status: 400 });
    }

    const desc = typeof body.description === "string" ? body.description.trim() : null;

    const budget = await prisma.budget.create({
      data: {
        organizationId: orgId,
        name: desc,
        description: desc,
        totalAmount: amount,
        remaining: amount,
      },
    });

    return NextResponse.json({ success: true, budget }, { status: 201 });
  } catch (e: any) {
    console.error("[capital-budget POST] error:", e);
    return NextResponse.json(
      { error: "Failed to create budget", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

// PUT /api/capital-budget  (compat -> Budget update)
// ห้าม reset remaining ทิ้ง -> ปรับตาม delta ของ totalAmount
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "STOCK"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const body = await request.json();
    const id = String(body.id || "");
    const amount = body.amount !== undefined ? Number(body.amount) : undefined;
    const desc = typeof body.description === "string" ? body.description.trim() : undefined;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
      return NextResponse.json({ error: "amount ต้องเป็นตัวเลขมากกว่า 0" }, { status: 400 });
    }

    const existing = await prisma.budget.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, totalAmount: true, remaining: true },
    });
    if (!existing) return NextResponse.json({ error: "Budget not found" }, { status: 404 });

    const oldTotal = Number(existing.totalAmount) || 0;
    const oldRemaining = Number(existing.remaining) || 0;
    const newTotal = amount ?? oldTotal;

    const delta = newTotal - oldTotal;
    const newRemaining = Math.max(0, oldRemaining + delta);

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        totalAmount: newTotal,
        remaining: newRemaining,
        ...(desc !== undefined ? { name: desc, description: desc } : {}),
      },
    });

    return NextResponse.json({ success: true, budget });
  } catch (e: any) {
    console.error("[capital-budget PUT] error:", e);
    return NextResponse.json(
      { error: "Failed to update budget", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

// DELETE /api/capital-budget?id=...
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "STOCK"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const b = await prisma.budget.findFirst({
      where: { id, organizationId: orgId },
      select: { totalAmount: true, remaining: true },
    });
    if (!b) return NextResponse.json({ error: "Budget not found" }, { status: 404 });

    const spent = (Number(b.totalAmount) || 0) - (Number(b.remaining) || 0);
    if (spent > 0) {
      return NextResponse.json({ error: "ลบไม่ได้: งบก้อนนี้ถูกใช้ไปแล้ว", spent }, { status: 400 });
    }

    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[capital-budget DELETE] error:", e);
    return NextResponse.json(
      { error: "Failed to delete budget", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
