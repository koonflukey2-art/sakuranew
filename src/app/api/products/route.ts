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

    // Calculate total cost for capital budget deduction
    const totalCost = parseFloat(body.costPrice) * parseInt(body.quantity);

    // Create product and update capital budget in a transaction
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

    // Deduct from capital budget
    const capitalBudget = await prisma.capitalBudget.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
    });

    if (capitalBudget) {
      // Update remaining budget
      await prisma.capitalBudget.update({
        where: { id: capitalBudget.id },
        data: {
          remaining: { decrement: totalCost },
        },
      });

      // Create transaction record
      await prisma.capitalBudgetTransaction.create({
        data: {
          budgetId: capitalBudget.id,
          type: "DEDUCT",
          amount: totalCost,
          description: `เพิ่มสินค้า: ${body.name} (${body.quantity} ชิ้น)`,
          productId: product.id,
          createdBy: user.clerkId || "",
          organizationId: user.organizationId,
        },
      });

      console.log(`💰 Capital budget deducted: ฿${totalCost.toLocaleString()}`);
      console.log(`   Product: ${body.name} (${body.quantity} units)`);
      console.log(`   Remaining: ฿${(capitalBudget.remaining - totalCost).toLocaleString()}`);
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

    // Get old product data to calculate cost difference
    const oldProduct = await prisma.product.findUnique({
      where: { id: body.id },
    });

    if (!oldProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Calculate cost difference
    const oldTotalCost = oldProduct.quantity * oldProduct.costPrice;
    const newTotalCost = parseInt(body.quantity) * parseFloat(body.costPrice);
    const costDifference = newTotalCost - oldTotalCost;

    // Update product
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

    // Adjust capital budget if cost changed
    if (costDifference !== 0) {
      const capitalBudget = await prisma.capitalBudget.findFirst({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: "desc" },
      });

      if (capitalBudget) {
        // Update remaining budget (deduct the difference)
        await prisma.capitalBudget.update({
          where: { id: capitalBudget.id },
          data: {
            remaining: { decrement: costDifference },
          },
        });

        // Create transaction record
        await prisma.capitalBudgetTransaction.create({
          data: {
            budgetId: capitalBudget.id,
            type: costDifference > 0 ? "DEDUCT" : "ADD",
            amount: Math.abs(costDifference),
            description: `แก้ไขสินค้า: ${body.name} (${costDifference > 0 ? "เพิ่ม" : "ลด"}ต้นทุน ฿${Math.abs(costDifference).toLocaleString()})`,
            productId: product.id,
            createdBy: user.clerkId || "",
            organizationId: user.organizationId,
          },
        });

        console.log(`💰 Capital budget adjusted: ${costDifference > 0 ? "-" : "+"}฿${Math.abs(costDifference).toLocaleString()}`);
        console.log(`   Product: ${body.name}`);
        console.log(`   Old cost: ฿${oldTotalCost.toLocaleString()} → New cost: ฿${newTotalCost.toLocaleString()}`);
      }
    }

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
