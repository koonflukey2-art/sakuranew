import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getToken } from "next-auth/jwt";

export type UserRole = "ADMIN" | "STOCK" | "EMPLOYEE";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  organizationId: string | null;
}

function normalizeRole(dbRole: unknown): UserRole {
  const role = String(dbRole ?? "").toUpperCase();

  // รองรับ legacy role เผื่อมีข้อมูลเก่า
  if (role === "STOCK_STAFF") return "STOCK";
  if (role === "USER") return "EMPLOYEE";

  if (role === "ADMIN") return "ADMIN";
  if (role === "STOCK") return "STOCK";
  return "EMPLOYEE";
}

/**
 * Server-only helper: ดึง user จาก session -> ไปอ่าน role/organizationId จาก DB จริง
 */


export async function getCurrentUser(_request?: Request): Promise<AuthUser | null> {
  try {
    // ✅ สำคัญ: ใน App Router ให้ใช้ auth() เปล่า ๆ
    const session = await auth();
    const sessionUserId = session?.user?.id;

    if (!sessionUserId) return null;

    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: normalizeRole(user.role),
      organizationId: user.organizationId ?? null,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}



/**
 * ใช้เช็ค role แบบง่าย ๆ
 */
export function hasRole(user: AuthUser, allowed: UserRole | UserRole[]): boolean {
  const list = Array.isArray(allowed) ? allowed : [allowed];
  return list.includes(user.role);
}
