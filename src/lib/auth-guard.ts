import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { UserRole } from "@/lib/auth";

export async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, response: null };
}

export async function requireRole(role: UserRole) {
  const { session, response } = await requireSession();

  if (response) {
    return { session: null, response };
  }

  if (session?.user.role !== role) {
    return {
      session,
      response: NextResponse.json(
        { error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" },
        { status: 403 }
      ),
    };
  }

  return { session, response: null };
}
