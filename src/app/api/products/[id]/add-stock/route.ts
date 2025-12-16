import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/products/[id]/add-stock - Add stock to product
export async function POST(
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
        { error: "Forbidden: Only ADMIN and STOCK can add stock" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { quantity, costPrice } = body;

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Invalid quantity" },
        { status: 400 }
      );
    }

    if (costPrice === undefined || costPrice === null || costPrice < 0) {
      return NextResponse.json(
        { error: "Invalid cost price" },
        { status: 400 }
      );
    }

    // Calculate total cost
    const totalCost = Number(costPrice) * parseInt(quantity);

    console.log(`📦 Adding stock: ${quantity} units @ ฿${costPrice} = ฿${totalCost.toLocaleString()}`);

    // Check available budget
    const budget = await prisma.capitalBudget.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
    });

    if (!budget) {
      return NextResponse.json(
        {
          error: "ไม่พบงบประมาณ กรุณาเพิ่มงบประมาณก่อน",
        },
        { status: 400 }
      );
    }

    if (totalCost > budget.remaining) {
      console.warn(
        `⚠️  Insufficient budget: Need ฿${totalCost.toLocaleString()}, Have ฿${budget.remaining.toLocaleString()}`
      );
      return NextResponse.json(
        {
          error: "งบประมาณไม่เพียงพอ",
          required: totalCost,
          available: budget.remaining,
          shortage: totalCost - budget.remaining,
        },
        { status: 400 }
      );
    }

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Update product quantity and budget used
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        quantity: { increment: parseInt(quantity) },
        budgetUsed: { increment: totalCost },
      },
    });

    // Deduct from capital budget
    try {
      await prisma.capitalBudget.update({
        where: { id: budget.id },
        data: {
          remaining: { decrement: totalCost },
        },
      });

      // Create transaction record
      await prisma.capitalBudgetTransaction.create({
        data: {
          budgetId: budget.id,
          type: "DEDUCT",
          amount: totalCost,
          description: `เพิ่มสต๊อก: ${product.name} (+${quantity} ชิ้น @ ฿${costPrice})`,
          productId: product.id,
          createdBy: user.id,
          organizationId: user.organizationId,
        },
      });

      console.log(`✅ Stock added successfully`);
      console.log(`   📦 Product: ${product.name}`);
      console.log(`   ➕ Added: ${quantity} units`);
      console.log(`   💰 Cost: ฿${totalCost.toLocaleString()}`);
      console.log(`   📊 New quantity: ${updatedProduct.quantity}`);
      console.log(`   💵 Remaining budget: ฿${(budget.remaining - totalCost).toLocaleString()}`);
    } catch (budgetError) {
      console.error("❌ Failed to deduct budget:", budgetError);
      // Rollback product update
      await prisma.product.update({
        where: { id: params.id },
        data: {
          quantity: { decrement: parseInt(quantity) },
          budgetUsed: { decrement: totalCost },
        },
      });
      return NextResponse.json(
        { error: "Failed to process budget deduction" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      budgetDeducted: totalCost,
      remainingBudget: budget.remaining - totalCost,
      message: `เพิ่มสต๊อก ${quantity} ชิ้น สำเร็จ หักงบประมาณ ฿${totalCost.toLocaleString()}`,
    });
  } catch (error) {
    console.error("Failed to add stock:", error);
    return NextResponse.json(
      { error: "Failed to add stock" },
      { status: 500 }
    );
  }
}
