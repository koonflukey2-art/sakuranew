// src/app/api/capital-budget/route.ts
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getOrganizationId } from "@/lib/organization";

// GET /api/capital-budget  -> ดึงงบทั้งหมด (ไว้โชว์ในหน้า CapitalBudgetPage)
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const budgets = await prisma.budget.findMany({
      where: { organizationId: orgId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    const result = budgets.map((b) => ({
      id: b.id,
      name: b.name ?? "",
      description: b.description ?? "",
      totalAmount: b.totalAmount,
      remaining: b.remaining,
      createdAt: b.createdAt.toISOString(),
      items: b.items.map((it) => ({
        id: it.id,
        name: it.name,
        amount: it.amount,
        quantity: it.quantity,
        notes: it.notes ?? "",
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

// POST /api/capital-budget  -> ใช้ตอนกด "บันทึกงบประมาณ" จากหน้า CapitalBudgetPage
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name: string = body.name ?? "งบประมาณ";
    const description: string = body.description ?? "";
    const items: Array<{
      name: string;
      amount: number;
      quantity: number;
      notes?: string;
    }> = body.items ?? [];

    const validItems = items.filter(
      (item) => item.name?.trim() && Number(item.amount) > 0
    );

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: "ต้องมีรายการค่าใช้จ่ายอย่างน้อย 1 รายการ" },
        { status: 400 }
      );
    }

    const totalAmountFromBody = Number(body.totalAmount) || 0;
    const totalAmountFromItems = validItems.reduce(
      (sum, it) => sum + Number(it.amount) * (Number(it.quantity) || 1),
      0
    );
    const totalAmount =
      totalAmountFromBody > 0 ? totalAmountFromBody : totalAmountFromItems;

    // 1) สร้าง record ในตาราง budget (ของหน้า capital-budget เดิม)
    const budget = await prisma.budget.create({
      data: {
        organizationId: orgId,
        name,
        description,
        totalAmount,
        remaining: totalAmount,
        items: {
          create: validItems.map((item) => ({
            name: item.name,
            amount: Number(item.amount),
            quantity: Number(item.quantity) || 1,
            notes: item.notes ?? "",
          })),
        },
      },
      include: { items: true },
    });

    // 2) ✅ SYNC ไปเพิ่มงบใน capitalBudget เพื่อให้หน้า Products อัปเดต "งบคงเหลือ"
    const latestCapitalBudget = await prisma.capitalBudget.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    let capitalBudget;

    if (latestCapitalBudget) {
      capitalBudget = await prisma.capitalBudget.update({
        where: { id: latestCapitalBudget.id },
        data: {
          amount: { increment: totalAmount },
          remaining: { increment: totalAmount },
          ...(body.minThreshold !== undefined && body.minThreshold !== null
            ? { minThreshold: Number(body.minThreshold) || latestCapitalBudget.minThreshold }
            : {}),
        },
      });
    } else {
      // ✅ แก้ตรงนี้: ต้องมี createdBy ตาม schema ของคุณ
      capitalBudget = await prisma.capitalBudget.create({
        data: {
          organizationId: orgId,
          amount: totalAmount,
          remaining: totalAmount,
          minThreshold: Number(body.minThreshold) || 5000,
          createdBy: user.id, // ✅ FIX: เติม createdBy
        },
      });
    }

    // 3) (ถ้ามีตาราง transaction) บันทึกประวัติการเพิ่มงบ
    try {
      await prisma.capitalBudgetTransaction.create({
        data: {
          budgetId: capitalBudget.id,
          type: "ADD", // ถ้า enum ไม่มี ADD ให้เปลี่ยนเป็นค่าที่มีจริง
          amount: totalAmount,
          description: `เพิ่มงบ: ${name}`,
          createdBy: user.id,
          organizationId: orgId,
        },
      });
    } catch (txErr) {
      console.warn(
        "⚠️ Skip capitalBudgetTransaction (model/enum may not exist):",
        txErr
      );
    }

    return NextResponse.json(
      {
        id: budget.id,
        name: budget.name ?? "",
        description: budget.description ?? "",
        totalAmount: budget.totalAmount,
        remaining: budget.remaining,
        createdAt: budget.createdAt.toISOString(),
        items: budget.items.map((it) => ({
          id: it.id,
          name: it.name,
          amount: it.amount,
          quantity: it.quantity,
          notes: it.notes ?? "",
        })),
        capitalBudgetRemaining: capitalBudget.remaining, // extra
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create capital budget:", error);
    return NextResponse.json(
      { error: "Failed to create capital budget" },
      { status: 500 }
    );
  }
}
