// app/api/cron/daily-cutoff/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDailySummaryForOrg } from "@/lib/dailyCutoff";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // 1) ตรวจ secret จาก query
    const secret = request.nextUrl.searchParams.get("secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) ดึงทุก organization (ปรับชื่อ model ให้ตรงกับ schema ของคุณ)
    const orgs = await prisma.organization.findMany({
      select: { id: true },
    });

    const targetDate = new Date(); // วันนี้ (จะตัดตามวัน server)

    const results = [];
    for (const org of orgs) {
      const res = await createDailySummaryForOrg(org.id, targetDate);
      results.push({
        organizationId: org.id,
        created: res.created,
        summaryId: res.summary.id,
      });
    }

    return NextResponse.json({
      ok: true,
      ranFor: results.length,
      results,
    });
  } catch (error: any) {
    console.error("Cron daily-cutoff error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run cron" },
      { status: 500 }
    );
  }
}
