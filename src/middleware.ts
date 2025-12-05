// src/middleware.ts

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// กำหนด route ที่ "ไม่ต้อง" login
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",        // webhook ของ Clerk
  "/api/line/webhook(.*)",    // ✅ webhook ของ LINE ต้อง public
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // If user is logged in and tries to access root, redirect to dashboard
  if (userId && request.nextUrl.pathname === "/") {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Protect dashboard routes
  if (!userId && !isPublicRoute(request)) {
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
