import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { unlink } from "fs/promises";
import { join } from "path";

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
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const receipt = await prisma.adReceipt.findFirst({
      where: { id: params.id, organizationId: dbUser.organizationId },
      select: { id: true, receiptUrl: true },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.adReceipt.delete({ where: { id: receipt.id } });

    // ลบไฟล์ local (best effort)
    if (receipt.receiptUrl?.startsWith("/uploads/")) {
      const filename = receipt.receiptUrl.replace("/uploads/", "");
      const filepath = join(process.cwd(), "public", "uploads", filename);
      try {
        await unlink(filepath);
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete receipt error:", error);
    return NextResponse.json(
      { error: error?.message || "Delete failed" },
      { status: 500 }
    );
  }
}
