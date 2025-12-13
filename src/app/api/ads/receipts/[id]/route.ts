import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { join } from "path";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { organizationId: true },
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json(
        { error: "Organization not found for this user" },
        { status: 404 }
      );
    }

    const orgId = dbUser.organizationId;
    const id = params.id;

    const receipt = await prisma.adReceipt.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, receiptUrl: true },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // ลบไฟล์ใน public/uploads ถ้าเป็น path /uploads/...
    if (receipt.receiptUrl?.startsWith("/uploads/")) {
      const fileName = receipt.receiptUrl.replace("/uploads/", "");
      const filePath = join(process.cwd(), "public", "uploads", fileName);

      if (existsSync(filePath)) {
        try {
          await unlink(filePath);
        } catch {}
      }
    }

    await prisma.adReceipt.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[DELETE receipt] error:", e);
    return NextResponse.json(
      { error: e?.message || "Delete failed" },
      { status: 500 }
    );
  }
}
