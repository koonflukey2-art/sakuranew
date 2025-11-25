import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { canEditAds } from "@/lib/permissions";

// GET: Fetch all ad rules for current user
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!canEditAds(user.role)) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ดู Ad Rules" },
        { status: 403 }
      );
    }

    const adRules = await prisma.adRule.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(adRules);
  } catch (error) {
    console.error("Error fetching ad rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch ad rules" },
      { status: 500 }
    );
  }
}

// POST: Create new ad rule
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!canEditAds(user.role)) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์สร้าง Ad Rules" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, platform, condition, action, useAI, status } = body;

    if (!name || !condition || !action) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบ (ชื่อ, เงื่อนไข, การกระทำ)" },
        { status: 400 }
      );
    }

    const adRule = await prisma.adRule.create({
      data: {
        userId: user.id,
        name,
        description: description || null,
        platform: platform || null,
        condition,
        action,
        useAI: useAI ?? true,
        status: status || "ACTIVE",
      },
    });

    return NextResponse.json(adRule);
  } catch (error) {
    console.error("Error creating ad rule:", error);
    return NextResponse.json(
      { error: "Failed to create ad rule" },
      { status: 500 }
    );
  }
}

// PUT: Update ad rule
export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!canEditAds(user.role)) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์แก้ไข Ad Rules" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, description, platform, condition, action, useAI, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "กรุณาระบุ rule ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.adRule.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Ad rule not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (platform !== undefined) updateData.platform = platform;
    if (condition !== undefined) updateData.condition = condition;
    if (action !== undefined) updateData.action = action;
    if (useAI !== undefined) updateData.useAI = useAI;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.adRule.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating ad rule:", error);
    return NextResponse.json(
      { error: "Failed to update ad rule" },
      { status: 500 }
    );
  }
}

// DELETE: Delete ad rule
export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!canEditAds(user.role)) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ลบ Ad Rules" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "กรุณาระบุ rule ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.adRule.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Ad rule not found" },
        { status: 404 }
      );
    }

    await prisma.adRule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ad rule:", error);
    return NextResponse.json(
      { error: "Failed to delete ad rule" },
      { status: 500 }
    );
  }
}
