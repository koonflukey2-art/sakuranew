import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { join } from "path";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

export const runtime = "nodejs";

function getUploadDir() {
  return process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { organizationId: true },
    });
    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { id } = await ctx.params;
    const orgId = dbUser.organizationId;

    const receipt = await prisma.adReceipt.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, receiptUrl: true },
    });
    if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // ลบ DB ก่อน
    await prisma.adReceipt.delete({ where: { id: receipt.id } });

    // ลบไฟล์ (ถ้ามี) — ตอนนี้ receiptUrl เป็น /api/uploads/<filename>
    const url = receipt.receiptUrl || "";
    if (url.startsWith("/api/uploads/")) {
      const filename = url.replace("/api/uploads/", "");
      const fullpath = join(getUploadDir(), filename);
      if (existsSync(fullpath)) {
        await unlink(fullpath).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Delete receipt error:", e);
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}
