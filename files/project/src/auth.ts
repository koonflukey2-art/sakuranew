import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

// ปรับได้: จะรีเฟรช role จาก DB ทุกกี่วินาที
const ROLE_REFRESH_TTL_SEC = 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/sign-in",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const creds = credentials as Record<string, string> | undefined;
        const email = creds?.email?.toLowerCase();
          const password = creds?.password;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
          },
        });

        if (!user?.password) { console.error("[AUTH][DEBUG] user missing or no password", { email }); return null; }

        const isValid = await bcrypt.compare(password, user.password);
        console.error("[AUTH][DEBUG] compare", { email, isValid, hashPrefix: String(user.password).slice(0,4) });
        if (!isValid) return null;

        // ✅ role จะถูกฝังใน token ตอน sign in
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role, // "ADMIN" | "STOCK" | "EMPLOYEE"
          rank: null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // ----- ตอน Sign in -----
      if (user) {
        token.id = (user as any).id;
        token.name = (user as any).name;
        token.role = (user as any).role ?? "EMPLOYEE";
        token.rank = (user as any).rank ?? null;

        // เก็บเวลาที่ sync role ล่าสุด
        token.roleSyncedAt = Math.floor(Date.now() / 1000);
        return token;
      }

      // ----- หลังจากนั้นทุก request ที่มีการอ่าน session/token -----
      // ถ้ามี id ให้ลอง sync role จาก DB เป็นระยะ
      const now = Math.floor(Date.now() / 1000);
      const last = (token as any).roleSyncedAt as number | undefined;

      // ไม่มี id ก็ไม่ทำอะไร
      const userId = (token as any).id as string | undefined;
      if (!userId) {
        if (!token.role) token.role = "EMPLOYEE";
        return token;
      }

      // TTL ยังไม่หมด ไม่ต้องยิง DB
      if (last && now - last < ROLE_REFRESH_TTL_SEC) {
        if (!token.role) token.role = "EMPLOYEE";
        return token;
      }

      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });

        token.role = dbUser?.role ?? "EMPLOYEE";
        (token as any).roleSyncedAt = now;
      } catch (e) {
        // ถ้า DB มีปัญหา ให้ fallback ค่าเดิม
        if (!token.role) token.role = "EMPLOYEE";
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id as string;
        session.user.name = (token.name as string | null) ?? session.user.name;
        (session.user as any).role = (token.role as string) ?? "EMPLOYEE";
        (session.user as any).rank = ((token as any).rank as string | null) ?? null;
      }
      return session;
    },
  },
});
