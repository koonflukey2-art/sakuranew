import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const rows = await prisma.$queryRaw<
    { adreceipt: string | null; admetrics: string | null }[]
  >`
    SELECT to_regclass('public."AdReceipt"') AS adreceipt,
           to_regclass('public."AdMetrics"') AS admetrics;
  `;
  return NextResponse.json({ rows });
}
