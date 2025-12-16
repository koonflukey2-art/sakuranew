import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/products/[id] - Edit product name only
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    if (user.role !== "ADMIN" && user.role !== "STOCK") {
      return NextResponse.json(
        { error: "Forbidden: Only ADMIN and STOCK can edit products" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    // Update only name
    const product = await prisma.product.update({
      where: { id: params.id },
      data: { name: name.trim() },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete product and return budget
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    if (user.role !== "ADMIN" && user.role !== "STOCK") {
      return NextResponse.json(
        { error: "Forbidden: Only ADMIN and STOCK can delete products" },
        { status: 403 }
      );
    }

    // Get product info before deletion
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Calculate budget to return (costPrice × remaining quantity)
    const budgetToReturn = product.costPrice * product.quantity;

    console.log(
      `🗑️  Deleting product: ${product.name} (${product.quantity} units @ ฿${product.costPrice})`
    );
    console.log(`   💰 Budget to return: ฿${budgetToReturn.toLocaleString()}`);

    // Delete product
    await prisma.product.delete({
      where: { id: params.id },
    });

    // Return budget to most recent CapitalBudget
    if (budgetToReturn > 0) {
      try {
        const budget = await prisma.capitalBudget.findFirst({
          where: { organizationId: user.organizationId },
          orderBy: { createdAt: "desc" },
        });

        if (budget) {
          // Update budget remaining
          await prisma.capitalBudget.update({
            where: { id: budget.id },
            data: {
              remaining: { increment: budgetToReturn },
            },
          });

          // Create transaction record
          await prisma.capitalBudgetTransaction.create({
            data: {
              budgetId: budget.id,
              type: "ADD",
              amount: budgetToReturn,
              description: `งบคืนจากการลบสินค้า: ${product.name} (${product.quantity} ชิ้น × ฿${product.costPrice})`,
              productId: product.id,
              createdBy: user.id,
              organizationId: user.organizationId,
            },
          });

          console.log(
            `✅ Budget returned: ฿${budgetToReturn.toLocaleString()} to budget ${budget.id}`
          );
        } else {
          console.warn("⚠️  No budget found to return money to");
        }
      } catch (budgetError) {
        console.error("❌ Failed to return budget:", budgetError);
        // Product is already deleted, but budget return failed
        // Log this but don't fail the delete operation
      }
    }

    return NextResponse.json({
      success: true,
      budgetReturned: budgetToReturn,
      message: `ลบสินค้า "${product.name}" สำเร็จ คืนงบประมาณ ฿${budgetToReturn.toLocaleString()}`,
    });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
