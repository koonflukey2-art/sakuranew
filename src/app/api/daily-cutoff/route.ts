// app/api/daily-cutoff/route.ts  หรือ  src/app/api/daily-cutoff/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";
import { createDailySummaryForOrg } from "@/lib/dailyCutoff";

export const runtime = "nodejs";

// GET: ดึง summary ตามช่วงวันที่ / จำนวนวัน
export async function GET(req: NextRequest) {
  try {
    const orgId = await getOrganizationId();

    if (!orgId) {
      return NextResponse.json(
        { error: "No organization for current user" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const daysStr = searchParams.get("days");

    const where: any = {
      organizationId: orgId,
    };

    if (fromStr && toStr) {
      // เคสหน้า "วันนี้" – ส่ง from / to มาเป็นช่วงของวันนั้น
      const from = new Date(fromStr);
      const to = new Date(toStr);
      where.date = {
        gte: from,
        lte: to,
      };
    } else if (daysStr) {
      // เคส 7 วัน / 30 วัน ล่าสุด
      const days = Number(daysStr) || 7;
      const now = new Date();

      const start = new Date(now);
      start.setDate(start.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);

      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      where.date = {
        gte: start,
        lte: end,
      };
    }

    const summaries = await prisma.dailySummary.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(summaries, { status: 200 });
  } catch (err) {
    console.error("GET /api/daily-cutoff error:", err);
    return NextResponse.json(
      { error: "Failed to load daily summaries" },
      { status: 500 }
    );
  }
}

// POST: ตัดยอดวันนี้ด้วยมือ
export async function POST(_req: NextRequest) {
  try {
    const orgId = await getOrganizationId();

    if (!orgId) {
      return NextResponse.json(
        { error: "No organization for current user" },
        { status: 401 }
      );
    }

    const { summary, created } = await createDailySummaryForOrg(orgId);

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
