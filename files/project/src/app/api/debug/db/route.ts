import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const isProd = process.env.NODE_ENV === "production";
  const debugEnabled =
    process.env.DEBUG_ROUTES_ENABLED?.toLowerCase() === "true";
  if (isProd && !debugEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await prisma.$queryRaw<
    { adreceipt: string | null; admetrics: string | null }[]
  >`
    SELECT to_regclass('public."AdReceipt"') AS adreceipt,
           to_regclass('public."AdMetrics"') AS admetrics;
  `;
  return NextResponse.json({ rows });
}
