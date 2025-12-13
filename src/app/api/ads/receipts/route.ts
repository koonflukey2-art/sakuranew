import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { organizationId: true },
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const orgId = dbUser.organizationId;

    // 1) ดึงรายการล่าสุด
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

    // 2) รวมยอดจาก DB (เร็ว/แม่นกว่า reduce ถ้าข้อมูลเยอะ)
    const agg = await prisma.adReceipt.aggregate({
      where: { organizationId: orgId },
      _sum: { amount: true },
    });

    const totalAmount = Number(agg._sum.amount ?? 0);

    // totalProfit ถ้าจะทำจริงต้อง join ไป campaign/metrics (ตอนนี้คง 0 เหมือนเดิม)
    const totalProfit = 0;

    return NextResponse.json(
      { receipts, totalAmount, totalProfit },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    console.error("[RECEIPTS][GET] error:", e?.message || e, e?.stack);
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}
