import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

function getUploadDir() {
  return process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
}

function filenameFromReceiptUrl(url: string | null) {
  if (!url) return null;
  // รองรับทั้ง /api/uploads/<file> และ /uploads/<file> (เผื่อข้อมูลเก่า)
  const m1 = url.match(/^\/api\/uploads\/(.+)$/);
  if (m1?.[1]) return m1[1];
  const m2 = url.match(/^\/uploads\/(.+)$/);
  if (m2?.[1]) return m2[1];
  return null;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { organizationId: true },
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const orgId = dbUser.organizationId;

    const receipt = await prisma.adReceipt.findFirst({
      where: { id: params.id, organizationId: orgId },
      select: { id: true, receiptUrl: true },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // ลบ DB ก่อน
    await prisma.adReceipt.delete({ where: { id: receipt.id } });

    // ลบไฟล์ (best-effort)
    const filename = filenameFromReceiptUrl(receipt.receiptUrl);
    if (filename) {
      const filePath = join(getUploadDir(), filename);
      if (existsSync(filePath)) {
        await unlink(filePath).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE] error:", err);
    return NextResponse.json({ error: err?.message || "Delete failed" }, { status: 500 });
  }
}
