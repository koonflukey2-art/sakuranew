import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";

function pickUserIdFromToken(token: any): string | null {
  return (
    (token?.sub ? String(token.sub) : null) ||
    (token?.id ? String(token.id) : null) ||
    (token?.userId ? String(token.userId) : null) ||
    (token?.user?.id ? String(token.user.id) : null) ||
    null
  );
}

function pickSessionTokenFromReq(req: NextRequest): string | null {
  return (
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value ||
    null
  );
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  const isHttps = (process.env.NEXTAUTH_URL || "").startsWith("https://");

  // 1) JWT session (ถ้ามี)
  try {
    const token = await getToken({
      req: req as any,
      secret,
      secureCookie: isHttps,
    } as any);

    const uid = pickUserIdFromToken(token);
    if (uid) return uid;
  } catch {}

  // 2) Database session (Prisma adapter)
  const sessionToken = pickSessionTokenFromReq(req);
  if (!sessionToken) return null;

  const anyPrisma = prisma as any;
  if (!anyPrisma.session?.findUnique) return null;

  const sess = await anyPrisma.session.findUnique({
    where: { sessionToken },
    select: { userId: true },
  });

  return sess?.userId ? String(sess.userId) : null;
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "presence ping ready" }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ ok: true, skipped: true }, { status: 200 });

  await prisma.user.update({
    where: { id: userId },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true, updated: true }, { status: 200 });
}
