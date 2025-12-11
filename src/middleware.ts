// src/middleware.ts

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// กำหนด route ที่ "ไม่ต้อง" login
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",          // webhook ของ Clerk
  "/api/line/webhook(.*)",      // ✅ webhook ของ LINE ต้อง public
  "/api/daily-cutoff/auto(.*)", // ✅ ให้ cron-job เรียกได้โดยไม่ต้อง login
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const pathname = request.nextUrl.pathname;
  const publicRoute = isPublicRoute(request);

  // ถ้า login แล้วและอยู่ที่ "/" → เด้งไป dashboard
  if (userId && pathname === "/") {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // ถ้าไม่ใช่ public route และยังไม่ login → เด้งไปหน้า login ("/")
  if (!userId && !publicRoute) {
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // public route หรือ user login แล้ว → ปล่อยผ่าน
  return NextResponse.next();
});

export const config = {
  matcher: [
    // ข้ามไฟล์ static ต่าง ๆ
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // ให้ middleware ทำงานกับทุก API route
    "/(api|trpc)(.*)",
  ],
};
