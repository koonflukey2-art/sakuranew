import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getOrganizationId } from "@/lib/organization";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const debugEnabled =
    process.env.DEBUG_ROUTES_ENABLED?.toLowerCase() === "true";
  if (isProd && !debugEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const h = await headers();
  const c = await cookies();

  const user = await getCurrentUser(request).catch(() => null);
  const orgId = user ? await getOrganizationId().catch(() => null) : null;

  return NextResponse.json({
    ok: true,
    host: h.get("host"),
    xForwardedProto: h.get("x-forwarded-proto"),
    cookieNames: c.getAll().map((x) => x.name),
    user: user
      ? { id: user.id, email: user.email ?? null, role: (user as any).role ?? null }
      : null,
    organizationId: orgId,
  });
}
