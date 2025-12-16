// src/app/api/capital-budget/route.ts
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getOrganizationId } from "@/lib/organization";

// GET /api/capital-budget
// ใช้ดึง "งบลงทุนล่าสุด" ของ organization ปัจจุบัน
export async function GET(_request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    // ใช้ตาราง CapitalBudget (ตัวเดียวกับที่ใช้ใน add-stock / products)
    const latestBudget = await prisma.capitalBudget.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    // ถ้ายังไม่มีงบเลย ส่งค่า default กลับไป (กัน front หลุด)
    if (!latestBudget) {
      return NextResponse.json({
        id: null,
        amount: 0,
        remaining: 0,
        organizationId: orgId,
        createdAt: null,
      });
    }

    return NextResponse.json(latestBudget);
  } catch (error) {
    console.error("Failed to fetch capital budget:", error);
    return NextResponse.json(
      { error: "Failed to fetch capital budget" },
      { status: 500 }
    );
  }
}

// POST /api/capital-budget
// ใช้สร้างงบลงทุนก้อนใหม่ (เช่น ตั้งงบประจำเดือน) 
// body ที่รับ: { totalAmount } หรือ { amount }
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({} as any));

    // รองรับทั้ง totalAmount และ amount
    const rawAmount = body.totalAmount ?? body.amount;
    const amountNum = parseFloat(String(rawAmount));

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "จำนวนงบไม่ถูกต้อง (ต้องมากกว่า 0)" },
        { status: 400 }
      );
    }

    // สร้าง CapitalBudget ใหม่
    const budget = await prisma.capitalBudget.create({
      data: {
        organizationId: orgId,
        amount: amountNum,
        remaining: amountNum,
        // ถ้าใน schema ของคุณมี field อื่น เช่น name, description
        // ค่อยมาเพิ่มทีหลังได้ เช่น:
        // name: body.name ?? "งบลงทุน",
        // description: body.description ?? null,
      },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Failed to create capital budget:", error);
    return NextResponse.json(
      { error: "Failed to create capital budget" },
      { status: 500 }
    );
  }
}
