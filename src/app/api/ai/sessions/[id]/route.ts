import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET - Get messages for a specific session
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.chatSession.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Get session messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch session messages" },
      { status: 500 }
    );
  }
}

// DELETE - ลบ session + messages ของ session นั้น
export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.chatSession.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // ลบ messages ก่อน
    await prisma.chatMessage.deleteMany({
      where: { sessionId: session.id },
    });

    // แล้วค่อยลบ session
    await prisma.chatSession.delete({
      where: { id: session.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
