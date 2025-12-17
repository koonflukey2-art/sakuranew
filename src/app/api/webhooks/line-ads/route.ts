// app/api/webhooks/line-ads/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();

  console.log("====== LINE-ADS TEST WEBHOOK ======");
  console.log("TIME:", new Date().toISOString());
  console.log("BODY:", body);

  // ตอบ 200 เสมอ เพื่อให้ LINE พอใจ
  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest) {
  console.log("====== LINE-ADS TEST GET ======");

  return NextResponse.json({
    ok: true,
    message: "LINE Ads TEST webhook ready",
  });
}
