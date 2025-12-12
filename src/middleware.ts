// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// เส้นทางที่ไม่ต้อง login
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",

  // webhooks
  "/api/webhooks(.*)",
  "/api/line/webhook(.*)",

  // legacy / public api
  "/api/daily-cutoff/auto(.*)",

  // ✅ cron endpoint (ปล่อย public แล้วให้ route ตรวจ secret เอง)
  "/api/cron/daily-summary(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const pathname = request.nextUrl.pathname;

  const publicRoute = isPublicRoute(request);
  const isApiPath = pathname.startsWith("/api");

  // ถ้าล็อกอินแล้วและเข้า "/" ให้ไป dashboard
  if (userId && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ไม่ล็อกอิน และไม่ใช่ public
  if (!userId && !publicRoute) {
    if (isApiPath) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // ✅ เปลี่ยนจาก "/" -> "/sign-in" ลดโอกาส loop/กระพิบ
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*|favicon.ico).*)",
    "/(api|trpc)(.*)",
  ],
};
