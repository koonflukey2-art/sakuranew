"use client";

// import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  // Comment SessionProvider ชั่วคราว
  return <>{children}</>;
  
  // เดิม:
  // return <SessionProvider>{children}</SessionProvider>;
}