import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/products
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "STOCK", "EMPLOYEE"].includes(user.role)) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลสินค้า" },
        { status: 403 }
      );
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
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
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

    // --- แปลงค่าทั้งหมดให้เป็น number ---
    const rawCostPrice = body.costPrice ?? 0;
    const rawSellPrice = body.sellPrice ?? undefined;
    const rawQuantity = body.quantity ?? 0;
    const rawMinStockLevel = body.minStockLevel ?? 10;

    const costPrice = Number(rawCostPrice) || 0;
    const quantity = parseInt(String(rawQuantity), 10) || 0;
    const minStockLevel = parseInt(String(rawMinStockLevel), 10) || 10;

    // ถ้าไม่ได้ส่ง sellPrice มา ให้ใช้ costPrice แทน (กัน Prisma ฟ้อง)
    const sellPrice =
      rawSellPrice !== undefined && rawSellPrice !== null
        ? Number(rawSellPrice) || 0
        : costPrice;

    // Calculate total cost for budget deduction
    const totalCost = costPrice * quantity;

    // ✅ ใช้ Budget (ไม่ใช้ CapitalBudget แล้ว)
    const budget = await prisma.budget.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
    });

    if (budget && totalCost > 0) {
      if (budget.remaining < totalCost) {
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
    } else if (!budget && totalCost > 0) {
      return NextResponse.json(
        { error: "ไม่พบงบประมาณ กรุณาเพิ่มงบประมาณก่อน" },
        { status: 400 }
      );
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name: body.name,
        category: body.category || null,
        productType: body.productType ?? 1,
        productTypeName: body.productTypeName || null,
        quantity,
        minStockLevel,
        costPrice,
        sellPrice,
        budgetUsed: totalCost,
        organizationId: user.organizationId,
      },
    });

    // ✅ Deduct from budget (ตามที่คุณสั่ง)
    if (budget && totalCost > 0) {
      await prisma.budget.update({
        where: { id: budget.id },
        data: { remaining: { decrement: totalCost } },
      });
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
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
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

    const rawCostPrice = body.costPrice ?? 0;
    const rawSellPrice = body.sellPrice ?? undefined;
    const rawQuantity = body.quantity ?? 0;
    const rawMinStockLevel = body.minStockLevel ?? 10;

    const costPrice = Number(rawCostPrice) || 0;
    const quantity = parseInt(String(rawQuantity), 10) || 0;
    const minStockLevel = parseInt(String(rawMinStockLevel), 10) || 10;

    const sellPrice =
      rawSellPrice !== undefined && rawSellPrice !== null
        ? Number(rawSellPrice) || 0
        : costPrice;

    const product = await prisma.product.update({
      where: { id: body.id },
      data: {
        name: body.name,
        category: body.category || null,
        productType: body.productType ?? 1,
        productTypeName: body.productTypeName || null,
        quantity,
        minStockLevel,
        costPrice,
        sellPrice,
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
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
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
