// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// เส้นทางที่ "ไม่ต้อง" login (public)
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // webhooks
  "/api/webhooks(.*)",
  "/api/line/webhook(.*)",
  // เดิมคุณเปิดไว้แล้ว
  "/api/daily-cutoff/auto(.*)",
  // ✅ เพิ่ม cron endpoint ให้ public
  "/api/cron/daily-summary(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const pathname = request.nextUrl.pathname;

  const publicRoute = isPublicRoute(request);
  const isApiPath = pathname.startsWith("/api");

  // ถ้าล็อกอินแล้วและกำลังจะเข้า "/" → เด้งไป dashboard
  if (userId && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ยังไม่ล็อกอิน และไม่ใช่ public route
  if (!userId && !publicRoute) {
    if (isApiPath) {
      // ✅ ถ้าเป็น API → ตอบ 401 JSON (ไม่ redirect ไปหน้า /)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // หน้าเว็บทั่วไปยัง redirect ไปหน้า login เหมือนเดิม
    return NextResponse.redirect(new URL("/", request.url));
  }

  // public route หรือ user login แล้ว → ปล่อยผ่าน
  return NextResponse.next();
});

// ให้ middleware ทำงานกับทุกเส้นทางยกเว้นไฟล์ static/system
export const config = {
  matcher: [
    // ข้าม _next, ไฟล์ static และไฟล์มีนามสกุล
    "/((?!_next|.*\\..*|favicon.ico).*)",
    // รวมถึง API/TRPC (จะถูกเช็ค public/401 ตามด้านบน)
    "/(api|trpc)(.*)",
  ],
};
