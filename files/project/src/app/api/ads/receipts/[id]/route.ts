import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { join } from "path";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

export const runtime = "nodejs";

function getUploadDir() {
  return process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
}

// NOTE:
// Next.js 15 route type-check บางเวอร์ชันมีความ strict/bug กับ dynamic params ([id])
// ทำให้ type ของ arg ที่ 2 ไม่ผ่านได้ทั้งแบบ Promise และ object
// ทางออกที่ปลอดภัยและ minimal: รับ ctx เป็น any แล้ว validate params runtime ให้ชัดเจน
export async function DELETE(request: NextRequest, ctx: any) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ลบสลิปโฆษณา" },
        { status: 403 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });
    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const idParam = ctx?.params?.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    if (typeof id !== "string" || !id) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const orgId = dbUser.organizationId;

    const receipt = await prisma.adReceipt.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, receiptUrl: true },
    });
    if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.adReceipt.delete({ where: { id: receipt.id } });

    // ลบไฟล์ ถ้า receiptUrl เป็น /api/uploads/<filename>
    if (receipt.receiptUrl?.startsWith("/api/uploads/")) {
      const filename = receipt.receiptUrl.replace("/api/uploads/", "");
      const fullpath = join(getUploadDir(), filename);
      if (existsSync(fullpath)) await unlink(fullpath).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Delete receipt error:", e);
    return NextResponse.json(
      { error: e?.message || "Delete failed" },
      { status: 500 }
    );
  }
}
