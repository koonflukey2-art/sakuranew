import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PREFIXES = [
  "/api/daily-cutoff",
  "/api/cron",
  "/api/health",
  "/auth",
  "/api/auth",
  "/api/webhooks/line",
  "/api/line/webhook",
  "/_next",
  "/favicon.ico",
];

async function readAuthToken(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

  // ✅ Auth.js v5 cookie names
  const t1 = await getToken({
    req: request,
    secret,
    cookieName: "__Secure-authjs.session-token",
  });
  if (t1) return t1;

  // fallback (กรณีไม่ secure cookie)
  const t2 = await getToken({
    req: request,
    secret,
    cookieName: "authjs.session-token",
  });
  if (t2) return t2;

  // fallback เผื่อบาง env ยังเป็น next-auth
  const t3 = await getToken({ req: request, secret });
  return t3;
}

export async function middleware(request: NextRequest) {
  // Bypass auth middleware for presence endpoints (route จะจัดการ auth เอง)
  if (request.nextUrl?.pathname?.startsWith("/api/presence/")) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p)
    )
  ) {
    return NextResponse.next();
  }

  const token = await readAuthToken(request);

  // Allow orders PDF report API to bypass auth in middleware (route will check org)
  if (pathname.startsWith("/api/orders/report/pdf")) {
    return NextResponse.next();
  }


  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/auth/sign-in", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*|favicon.ico).*)", "/(api|trpc)(.*)"],
};
