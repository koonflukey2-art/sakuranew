import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
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

    const orgId = dbUser.organizationId;

    const receipts = await prisma.adReceipt.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        receiptNumber: true,
        platform: true,
        amount: true,
        paidAt: true,
        receiptUrl: true,
        qrCodeData: true,
        isProcessed: true,
        campaign: { select: { campaignName: true } },
      },
    });

    const totalAmount = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);

    // totalProfit ของคุณถ้าอยากคำนวณจริงต้องไปดึงจาก campaign/metrics
    const totalProfit = 0;

    return NextResponse.json({ receipts, totalAmount, totalProfit });
  } catch (e: any) {
    console.error("Fetch receipts error:", e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
