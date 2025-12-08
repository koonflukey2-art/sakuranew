import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/products
export async function GET() {
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

    const products = await prisma.product.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST /api/products
export async function POST(request: Request) {
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

    // เฉพาะ ADMIN / STOCK เท่านั้นที่เพิ่มสินค้าได้
    if (user.role !== "ADMIN" && user.role !== "STOCK") {
      return NextResponse.json(
        { error: "Forbidden: Only ADMIN and STOCK can create products" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Calculate total cost for budget deduction
    const totalCost = parseFloat(body.costPrice || 0) * parseInt(body.quantity || 0, 10);

    // Create product
    const product = await prisma.product.create({
      data: {
        name: body.name,
        category: body.category,
        productType: body.productType ?? null,
        quantity: body.quantity ?? 0,
        minStockLevel: body.minStockLevel ?? 10,
        costPrice: body.costPrice,
        sellPrice: body.sellPrice,
        // ✅ ผูกกับ organization ตาม schema ใหม่
        organizationId: user.organizationId,
      },
    });

    // Deduct from capital budget (allow negative)
    try {
      const budget = await prisma.capitalBudget.findFirst({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: "desc" },
      });

      if (budget && totalCost > 0) {
        // Update budget remaining
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
            description: `ซื้อสินค้า: ${body.name} (${body.quantity} ชิ้น)`,
            productId: product.id,
            createdBy: user.id,
            organizationId: user.organizationId,
          },
        });

        console.log(`💰 Budget deducted: ฿${totalCost.toLocaleString()}`);
        console.log(`   Product: ${body.name} (${body.quantity} units @ ฿${body.costPrice} each)`);
        console.log(`   Remaining: ฿${(budget.remaining - totalCost).toLocaleString()}`);
      }
    } catch (budgetError) {
      console.error("Failed to deduct budget:", budgetError);
      // Don't fail the product creation if budget deduction fails
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

// PUT /api/products
export async function PUT(request: Request) {
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
        { error: "Forbidden: Only ADMIN and STOCK can update products" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // (ถ้าจะกัน cross-org จริง ๆ ควร check ว่า product นี้ belong กับ org เดียวกันก่อน)
    const product = await prisma.product.update({
      where: { id: body.id },
      data: {
        name: body.name,
        category: body.category,
        productType: body.productType ?? null,
        quantity: body.quantity,
        minStockLevel: body.minStockLevel,
        costPrice: body.costPrice,
        sellPrice: body.sellPrice,
      },
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

// DELETE /api/products?id=...
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
