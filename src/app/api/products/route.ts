import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
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

export async function POST(request: Request) {
  try {
    // Get current user with role
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and STOCK can create products
    if (user.role !== "ADMIN" && user.role !== "STOCK") {
      return NextResponse.json(
        { error: "Forbidden: Only ADMIN and STOCK can create products" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const product = await prisma.product.create({
      data: {
        name: body.name,
        category: body.category,
        quantity: body.quantity || 0,
        minStockLevel: body.minStockLevel || 10,
        costPrice: body.costPrice,
        sellPrice: body.sellPrice,
        userId: user.id, // Use database user ID
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // Get current user with role
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and STOCK can update products
    if (user.role !== "ADMIN" && user.role !== "STOCK") {
      return NextResponse.json(
        { error: "Forbidden: Only ADMIN and STOCK can update products" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const product = await prisma.product.update({
      where: { id: body.id },
      data: {
        name: body.name,
        category: body.category,
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

export async function DELETE(request: Request) {
  try {
    // Get current user with role
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and STOCK can delete products
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
