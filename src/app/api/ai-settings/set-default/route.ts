// src/app/api/ai-settings/set-default/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!dbUser.organizationId) {
      return NextResponse.json(
        { error: "No organization found for this user" },
        { status: 403 }
      );
    }

    const { providerId } = await request.json();

    if (!providerId) {
      return NextResponse.json(
        { error: "providerId is required" },
        { status: 400 }
      );
    }

    // ✅ ต้องเป็น provider ที่อยู่ในองค์กรเดียวกับ user
    const provider = await prisma.aIProvider.findFirst({
      where: { id: providerId, organizationId: dbUser.organizationId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    if (!provider.isValid) {
      return NextResponse.json(
        {
          error:
            "กรุณาทดสอบการเชื่อมต่อ AI Provider ให้สำเร็จก่อนตั้งเป็นค่าเริ่มต้น",
        },
        { status: 400 }
      );
    }

    // ยกเลิก default ทั้งหมดใน org เดียวกัน
    await prisma.aIProvider.updateMany({
      where: { organizationId: dbUser.organizationId },
      data: { isDefault: false },
    });

    // ตั้งตัวนี้เป็น default
    await prisma.aIProvider.update({
      where: { id: provider.id },
      data: { isDefault: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Set default provider error:", error);
    return NextResponse.json(
      { error: "Failed to set default" },
      { status: 500 }
    );
  }
}
