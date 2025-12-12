import { NextResponse } from "next/server";

// ให้รันบน Node runtime (ไม่ใช่ edge)
export const runtime = "nodejs";
// กัน Next เอาไปแคช/พรีเรนเดอร์
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // ตรวจ Bearer token
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: ใส่ลอจิกจริงสำหรับ daily summary ที่นี่
  // - อ่าน SystemSettings (cut-off hour/minute, notifyDailySummary, line token)
  // - รวมยอดออเดอร์วันนี้ด้วยต้นทุนแบบโปรโมชัน
  // - ส่งข้อความไป LINE Notify
  // - คืนผลลัพธ์

  return NextResponse.json({ ok: true, message: "cron endpoint is alive" });
}
