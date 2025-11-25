import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { id, platform } = body;

    if (!id || !platform) {
      return NextResponse.json(
        { error: "Account ID and platform required" },
        { status: 400 }
      );
    }

    await prisma.adAccount.updateMany({
      where: {
        userId: user.id,
        platform,
      },
      data: {
        isDefault: false,
      },
    });

    await prisma.adAccount.update({
      where: { id, userId: user.id },
      data: { isDefault: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Set default error:", error);
    return NextResponse.json(
      { error: "Failed to set default" },
      { status: 500 }
    );
  }
}
