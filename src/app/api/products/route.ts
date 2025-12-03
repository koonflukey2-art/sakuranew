import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrganizationId } from "@/lib/organization";

export async function GET() {
  try {
    // Get current user's organization ID
    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    // Fetch products for this organization
    const products = await prisma.product.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: {
        organization: {
          select: {
            name: true,
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

    // Get organization ID
    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
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
        organizationId: orgId, // Use organization ID instead of userId
      },
    });

    // Check if stock is low and send LINE alert
    if (product.quantity <= product.minStockLevel) {
      // Send async LINE alert (don't wait for it)
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/notifications/send-line`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "⚠️ เตือนสินค้าใกล้หมด!",
          message: `สินค้า "${product.name}" ถูกเพิ่มแล้ว แต่มีจำนวนเพียง ${product.quantity} ชิ้น\n(จุดสั่งซื้อที่ ${product.minStockLevel} ชิ้น)\n\nกรุณาสั่งซื้อเพิ่มเติม`,
        }),
      }).catch((err) => console.error("Failed to send LINE alert:", err));
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

    // Get organization ID
    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Verify product belongs to organization
    const existing = await prisma.product.findUnique({
      where: { id: body.id },
    });

    if (!existing || existing.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Product not found or access denied" },
        { status: 404 }
      );
    }

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

    // Check if stock is low and send LINE alert
    if (product.quantity <= product.minStockLevel) {
      // Send async LINE alert (don't wait for it)
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/notifications/send-line`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "⚠️ เตือนสินค้าใกล้หมด!",
          message: `สินค้า "${product.name}" เหลือเพียง ${product.quantity} ชิ้น\n(จุดสั่งซื้อที่ ${product.minStockLevel} ชิ้น)\n\nกรุณาสั่งซื้อเพิ่มเติมโดยเร็วที่สุด`,
        }),
      }).catch((err) => console.error("Failed to send LINE alert:", err));
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

    // Get organization ID
    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // Verify product belongs to organization before deleting
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product || product.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Product not found or access denied" },
        { status: 404 }
      );
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
