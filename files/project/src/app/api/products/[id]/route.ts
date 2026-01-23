import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/products/[id] - Edit product name only
export async function PATCH(request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    if (user.role !== "ADMIN" && user.role !== "STOCK") {
      return NextResponse.json(
        { error: "Forbidden: Only ADMIN and STOCK can edit products" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete product and return budget
export async function DELETE(request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    if (user.role !== "ADMIN" && user.role !== "STOCK") {
      return NextResponse.json(
        { error: "Forbidden: Only ADMIN and STOCK can delete products" },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        return { notFound: true as const };
      }

      const budgetToReturn = (Number(product.costPrice) || 0) * (Number(product.quantity) || 0);

      await tx.product.delete({ where: { id } });

      // คืนงบเข้าก้อนล่าสุด (ตามที่คุณต้องการ)
      const budget = await tx.budget.findFirst({
        where: { organizationId: user.organizationId! },
        orderBy: { createdAt: "desc" },
      });

      if (budget && budgetToReturn > 0) {
        await tx.budget.update({
          where: { id: budget.id },
          data: { remaining: { increment: budgetToReturn } },
        });
      }

      return { notFound: false as const, budgetToReturn, productName: product.name };
    });

    if (result.notFound) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      budgetReturned: result.budgetToReturn,
      message: `ลบสินค้า "${result.productName}" สำเร็จ คืนงบประมาณ ฿${result.budgetToReturn.toLocaleString()}`,
    });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
