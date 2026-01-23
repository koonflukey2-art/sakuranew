import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/products/[id]/add-stock - Add stock to product
export async function POST(request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    if (user.role !== "ADMIN" && user.role !== "STOCK") {
      return NextResponse.json(
        { error: "Forbidden: Only ADMIN and STOCK can add stock" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const quantity = parseInt(String(body.quantity), 10);
    const costPrice = Number(body.costPrice);

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    if (Number.isNaN(costPrice) || costPrice < 0) {
      return NextResponse.json({ error: "Invalid cost price" }, { status: 400 });
    }

    const totalCost = costPrice * quantity;

    console.log(
      `📦 Adding stock: ${quantity} units @ ฿${costPrice} = ฿${totalCost.toLocaleString()}`
    );

    // ✅ งบรวม: sum remaining ทุกก้อน
    const agg = await prisma.budget.aggregate({
      where: { organizationId: orgId },
      _sum: { remaining: true },
    });

    const available = agg._sum.remaining ?? 0;

    if (totalCost > available) {
      return NextResponse.json(
        {
          error: "งบประมาณไม่เพียงพอ",
          required: totalCost,
          available,
          shortage: totalCost - available,
        },
        { status: 400 }
      );
    }

    // ✅ ทำให้ atomic: อัปเดตสินค้า + หักงบทีละก้อนใน transaction
    const updatedProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const updated = await tx.product.update({
        where: { id },
        data: {
          quantity: { increment: quantity },
          budgetUsed: { increment: totalCost },
        },
      });

      // หักงบไล่ทีละก้อน (ล่าสุดก่อน)
      let left = totalCost;

      const budgets = await tx.budget.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        select: { id: true, remaining: true },
      });

      for (const b of budgets) {
        if (left <= 0) break;
        const rem = Number(b.remaining) || 0;
        if (rem <= 0) continue;

        const use = Math.min(rem, left);
        await tx.budget.update({
          where: { id: b.id },
          data: { remaining: { decrement: use } },
        });

        left -= use;
      }

      if (left > 0) {
        // กันเคส race condition
        throw new Error("BUDGET_NOT_ENOUGH_AFTER_DEDUCT");
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      budgetDeducted: totalCost,
      remainingBudget: available - totalCost,
      message: `เพิ่มสต๊อก ${quantity} ชิ้น สำเร็จ หักงบประมาณ ฿${totalCost.toLocaleString()}`,
    });
  } catch (error: any) {
    if (error?.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    console.error("Failed to add stock:", error);
    return NextResponse.json({ error: "Failed to add stock" }, { status: 500 });
  }
}
