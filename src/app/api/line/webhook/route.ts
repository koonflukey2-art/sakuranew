// src/app/api/line/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// รับ POST จาก LINE (หรือจาก curl/Postman) แล้วตอบ 200 เสมอ
export async function POST(req: NextRequest) {
  const bodyText = await req.text();

  console.log("🔥 LINE webhook POST hit");
  console.log("Headers:", Object.fromEntries(req.headers));
  console.log("Body:", bodyText);

  // กลับไปให้ LINE แค่ 200 OK
  return NextResponse.json({ ok: true }, { status: 200 });
}

// GET ใช้เช็คจาก browser
export async function GET() {
  console.log("🔥 LINE webhook GET hit");
  return NextResponse.json({
    ok: true,
    message: "LINE webhook alive ✅ (simple)",
  });
}
