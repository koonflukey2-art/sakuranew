// app/api/daily-cutoff/route.ts
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";
import { createDailySummaryForOrg } from "@/lib/dailyCutoff";

export const runtime = "nodejs";

// POST - Trigger manual cut-off (creates daily summary “วันนี้” ของ org ปัจจุบัน)
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    // ตัดยอดประจำวันที่วันนี้ (ตามเวลา server)
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const { summary, created } = await createDailySummaryForOrg(
      orgId,
      startOfDay
    );

    if (!created) {
      return NextResponse.json(
        { error: "Daily summary already exists for today" },
        { status: 400 }
      );
    }

    // summary ถูกสร้าง + ส่ง LINE ให้แล้วใน helper
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Daily cut-off error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create daily summary" },
      { status: 500 }
    );
  }
}

// GET - Fetch daily summaries with filters (เหมือนเดิม)
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json([], { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const days = searchParams.get("days");

    let where: any = { organizationId: orgId };

    if (from && to) {
      where.date = {
        gte: new Date(from),
        lte: new Date(to),
      };
    } else if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      where.date = { gte: daysAgo };
    }

    const summaries = await prisma.dailySummary.findMany({
      where,
      orderBy: { date: "desc" },
      take: 100,
    });

    return NextResponse.json(summaries);
  } catch (error: any) {
    console.error("GET daily summaries error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch summaries" },
      { status: 500 }
    );
  }
}
