// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // ป้องกันการสร้าง PrismaClient ซ้ำใน dev
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
