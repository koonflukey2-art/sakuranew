import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";

// GET: list product types
export async function GET(request: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const productTypes = await prisma.productType.findMany({
      where: { organizationId: orgId },
      orderBy: { code: "asc" },
    });

    return NextResponse.json(productTypes);
  } catch (error: any) {
    console.error("GET /api/product-types error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch product types" },
      { status: 500 }
    );
  }
}

// POST: create product type
export async function POST(request: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await request.json();
    const { code, name, description } = body;

    const codeNumber = parseInt(code, 10);
    if (!codeNumber || Number.isNaN(codeNumber)) {
      return NextResponse.json({ error: "รหัสประเภทสินค้าไม่ถูกต้อง" }, { status: 400 });
    }

    const existing = await prisma.productType.findFirst({
      where: { organizationId: orgId, code: codeNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: "รหัสประเภทสินค้านี้ถูกใช้แล้ว" },
        { status: 400 }
      );
    }

    const productType = await prisma.productType.create({
      data: {
        code: codeNumber,
        name,
        description,
        organizationId: orgId,
      },
    });

    return NextResponse.json(productType);
  } catch (error: any) {
    console.error("POST /api/product-types error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create product type" },
      { status: 500 }
    );
  }
}

// PUT: update product type
export async function PUT(request: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await request.json();
    const { id, name, description, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const ownedType = await prisma.productType.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!ownedType) {
      return NextResponse.json({ error: "ไม่พบข้อมูลประเภทสินค้า" }, { status: 404 });
    }

    const productType = await prisma.productType.update({
      where: { id },
      data: {
        name,
        description,
        isActive: typeof isActive === "boolean" ? isActive : undefined,
      },
    });

    return NextResponse.json(productType);
  } catch (error: any) {
    console.error("PUT /api/product-types error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update product type" },
      { status: 500 }
    );
  }
}

// DELETE: delete product type
export async function DELETE(request: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    await prisma.productType.deleteMany({
      where: { id, organizationId: orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/product-types error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete product type" },
      { status: 500 }
    );
  }
}
