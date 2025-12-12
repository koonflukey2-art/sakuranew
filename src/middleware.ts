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

  // ✅ cron endpoint (ต้อง public เพื่อให้ cron-job ยิงได้)
  "/api/cron/daily-summary(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;
  const isApiPath = pathname.startsWith("/api");

  const publicRoute = isPublicRoute(request);

  // ✅ ถ้าเป็น public route ให้ปล่อยผ่านทันที (กัน Clerk ไปยุ่งกับ auth header)
  if (publicRoute) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  // ถ้าล็อกอินแล้วและกำลังจะเข้า "/" → เด้งไป dashboard
  if (userId && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ยังไม่ล็อกอิน และไม่ใช่ public route
  if (!userId) {
    if (isApiPath) {
      // ✅ API → ตอบ 401 JSON (ไม่ redirect)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // หน้าเว็บทั่วไป → redirect ไปหน้า /
    return NextResponse.redirect(new URL("/", request.url));
  }

  // user login แล้ว → ปล่อยผ่าน
  return NextResponse.next();
});

// ให้ middleware ทำงานกับทุกเส้นทางยกเว้นไฟล์ static/system
export const config = {
  matcher: [
    // ข้าม _next, ไฟล์ static และไฟล์มีนามสกุล
    "/((?!_next|.*\\..*|favicon.ico).*)",
    // รวมถึง API/TRPC
    "/(api|trpc)(.*)",
  ],
};
