// src/middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const publicRoutes = new Set([
  "/",
  "/auth/sign-in",
  "/auth/sign-up",
]);

const publicApiPrefixes = [
  "/api/webhooks",
  "/api/cron",
  "/api/daily-cutoff",
  "/api/auth",
];

function isPublicPath(pathname: string) {
  if (publicRoutes.has(pathname)) {
    return true;
  }

  return publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const isApiPath = pathname.startsWith("/api");
  const isPublic = isPublicPath(pathname);
  const isAuthenticated = Boolean(request.auth?.user);

  if (isAuthenticated && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isAuthenticated && !isPublic) {
    if (isApiPath) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*|favicon.ico).*)",
    "/(api|trpc)(.*)",
  ],
};
