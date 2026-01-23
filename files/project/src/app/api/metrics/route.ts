import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - ดึงข้อมูล metrics plans ทั้งหมด
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const where = userId ? { userId } : {};

    const plans = await prisma.metricsPlan.findMany({
      where,
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

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Error fetching metrics plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics plans" },
      { status: 500 }
    );
  }
}

// POST - สร้าง metrics plan ใหม่
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const plan = await prisma.metricsPlan.create({
      data: {
        templateName: body.templateName,
        targets: body.targets,
        actual: body.actual || null,
        period: body.period,
        userId: body.userId || "temp-user-id",
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Error creating metrics plan:", error);
    return NextResponse.json(
      { error: "Failed to create metrics plan" },
      { status: 500 }
    );
  }
}

// PUT - อัพเดท metrics plan
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    const plan = await prisma.metricsPlan.update({
      where: { id },
      data: {
        templateName: data.templateName,
        targets: data.targets,
        actual: data.actual,
        period: data.period,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Error updating metrics plan:", error);
    return NextResponse.json(
      { error: "Failed to update metrics plan" },
      { status: 500 }
    );
  }
}

// DELETE - ลบ metrics plan
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    await prisma.metricsPlan.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting metrics plan:", error);
    return NextResponse.json(
      { error: "Failed to delete metrics plan" },
      { status: 500 }
    );
  }
}
