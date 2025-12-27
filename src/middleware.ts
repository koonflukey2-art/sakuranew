// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = new Set(["/", "/auth/sign-in", "/auth/sign-up"]);
const publicApiPrefixes = ["/api/webhooks", "/api/cron", "/api/daily-cutoff", "/api/auth"];

function isPublicPath(pathname: string) {
  if (publicRoutes.has(pathname)) return true;
  return publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

const roleRoutes: Record<string, string[]> = {
  EMPLOYEE: ["/dashboard"],
  STOCK: ["/dashboard", "/stock", "/orders", "/products", "/promotions", "/budget-requests", "/ai-chat"],
  ADMIN: ["*"],
};

const apiRoutes: Record<string, string[]> = {
  EMPLOYEE: ["/api/orders", "/api/orders/stats", "/api/products", "/api/products/types", "/api/capital-budget", "/api/me", "/api/notifications/check-alerts"],
  STOCK: ["/api/orders", "/api/orders/stats", "/api/products", "/api/products/types", "/api/promotions", "/api/budget-requests", "/api/ai-chat", "/api/ai/chat", "/api/me", "/api/notifications/check-alerts"],
  ADMIN: ["*"],
};

function hasAccess(role: string, pathname: string, mapping: Record<string, string[]>) {
  if (role === "ADMIN") return true;
  const allowed = mapping[role] ?? [];
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiPath = pathname.startsWith("/api");
  const isPublic = isPublicPath(pathname);

  // ✅ อ่าน JWT โดยไม่พึ่ง Prisma/NextAuth callbacks
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  const isAuthenticated = Boolean((token as any)?.id || token?.sub);
  const role = String((token as any)?.role || "EMPLOYEE");

  if (isAuthenticated && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isAuthenticated && !isPublic) {
    if (isApiPath) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  if (isAuthenticated && !isPublic) {
    const hasRoleAccess = isApiPath
      ? hasAccess(role, pathname, apiRoutes)
      : hasAccess(role, pathname, roleRoutes);

    if (!hasRoleAccess) {
      if (isApiPath) {
        return NextResponse.json({ error: "คุณไม่มีสิทธิ์เข้าถึงเส้นทางนี้" }, { status: 403 });
      }
      const url = new URL("/dashboard", request.url);
      url.searchParams.set("error", "คุณไม่มีสิทธิ์เข้าถึงเส้นทางนี้");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*|favicon.ico).*)", "/(api|trpc)(.*)"],
};
