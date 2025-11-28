// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/login(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // ถ้าเส้นทางนี้ไม่ใช่ public -> บังคับต้องล็อกอิน
  if (!isPublicRoute(request)) {
    const loginUrl = new URL("/login", request.url); // สร้าง absolute URL

    await auth.protect({
      unauthenticatedUrl: loginUrl.toString(), // ใช้ absolute URL แทน "/login"
    });
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
