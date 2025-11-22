import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - List all automation rules
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const where = userId ? { userId } : {};

    const rules = await prisma.automationRule.findMany({
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

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Failed to fetch automation rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation rules" },
      { status: 500 }
    );
  }
}

// POST - Create new automation rule
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const rule = await prisma.automationRule.create({
      data: {
        platform: body.platform,
        tool: body.tool,
        ruleName: body.ruleName,
        condition: body.condition,
        action: body.action,
        isActive: body.isActive !== undefined ? body.isActive : true,
        userId: body.userId || "temp-user-id", // TODO: Get from session
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("Failed to create automation rule:", error);
    return NextResponse.json(
      { error: "Failed to create automation rule" },
      { status: 500 }
    );
  }
}

// PUT - Update automation rule
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
    }

    const rule = await prisma.automationRule.update({
      where: { id: body.id },
      data: {
        platform: body.platform,
        tool: body.tool,
        ruleName: body.ruleName,
        condition: body.condition,
        action: body.action,
        isActive: body.isActive,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error("Failed to update automation rule:", error);
    return NextResponse.json(
      { error: "Failed to update automation rule" },
      { status: 500 }
    );
  }
}

// DELETE - Delete automation rule
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
    }

    await prisma.automationRule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete automation rule:", error);
    return NextResponse.json(
      { error: "Failed to delete automation rule" },
      { status: 500 }
    );
  }
}
