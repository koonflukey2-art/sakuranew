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

    const { providerId } = await request.json();

    // ยกเลิก default ทั้งหมด
    await prisma.aIProvider.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });

    // ตั้งเป็น default
    await prisma.aIProvider.update({
      where: { id: providerId },
      data: { isDefault: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Set default provider error:", error);
    return NextResponse.json({ error: "Failed to set default" }, { status: 500 });
  }
}
