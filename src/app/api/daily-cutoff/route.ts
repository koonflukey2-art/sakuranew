// src/app/api/daily-cutoff/route.ts
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { createDailySummaryForOrg } from "@/lib/dailyCutoff";

export const runtime = "nodejs";

// 🔹 GET: ใช้โหลด summary ในหน้า /daily-summary
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return new NextResponse("No organization", { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const daysParam = searchParams.get("days");

    const where: any = { organizationId };

    if (from && to) {
      // เคสเลือกวันเฉพาะ
      const fromDate = new Date(from);
      const toDate = new Date(to);

      const startOfFrom = new Date(
        fromDate.getFullYear(),
        fromDate.getMonth(),
        fromDate.getDate()
      );
      const endOfTo = new Date(
        toDate.getFullYear(),
        toDate.getMonth(),
        toDate.getDate()
      );

      where.date = {
        gte: startOfFrom,
        lte: endOfTo,
      };
    } else if (daysParam) {
      // เคส ?days=7 หรือ 30
      const days = Number(daysParam) || 7;
      const end = new Date();
      end.setHours(0, 0, 0, 0);

      const start = new Date(end);
      start.setDate(start.getDate() - (days - 1));

      where.date = {
        gte: start,
        lte: end,
      };
    }

    const summaries = await prisma.dailySummary.findMany({
      where,
      orderBy: { date: "desc" },
    });

    const result = summaries.map((s) => ({
      id: s.id,
      date: s.date.toISOString(),
      organizationId: s.organizationId,
      totalRevenue: s.totalRevenue,
      totalCost: s.totalCost,
      totalProfit: s.totalProfit,
      totalOrders: s.totalOrders,
      productsSold: (s.productsSold ?? []) as any,
      cutOffTime: s.cutOffTime ? s.cutOffTime.toISOString() : null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/daily-cutoff error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// 🔹 POST: ปุ่ม "ตัดยอดทันที" ในหน้าเว็บ
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return new NextResponse("No organization", { status: 400 });
    }

    // เผื่ออนาคตอยากส่งวันที่มาจาก body (ตอนนี้ถ้าไม่ส่งก็คือวันนี้)
    let targetDate: Date | undefined;
    try {
      const body = await req.json().catch(() => null);
      if (body?.date) {
        targetDate = new Date(body.date);
      }
    } catch {
      // ถ้า parse body ไม่ได้ก็ไม่เป็นไร ใช้วันนี้แทน
    }

    const { summary, created } = await createDailySummaryForOrg(
      organizationId,
      targetDate
    );

    return NextResponse.json(
      {
        ok: true,
        created,
        summary,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/daily-cutoff error:", err);
    return NextResponse.json(
      { error: "Failed to create daily summary" },
      { status: 500 }
    );
  }
}
