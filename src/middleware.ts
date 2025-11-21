import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  const publicPaths = ["/login", "/register"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // API auth routes are always accessible
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Check for session token (NextAuth v5 beta)
  const token =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isAuthenticated = !!token;

  // Redirect authenticated users away from auth pages
  if (isPublicPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect unauthenticated users to login
  if (!isPublicPath && !isAuthenticated) {
    const from = encodeURIComponent(pathname + request.nextUrl.search);
    return NextResponse.redirect(new URL(`/login?from=${from}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.webp$|.*\\.ico$).*)",
  ],
};