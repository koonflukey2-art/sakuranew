"use client";

// import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  // ปิด SessionProvider ชั่วคราว เพื่อหลีกเลี่ยง NextAuth errors
  return <>{children}</>;
}