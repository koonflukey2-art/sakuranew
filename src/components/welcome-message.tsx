"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";

export function WelcomeMessage() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoaded && user) {
      const hasShownWelcome = sessionStorage.getItem("hasShownWelcome");
      if (!hasShownWelcome) {
        toast({
          title: "🎉 เข้าสู่ระบบสำเร็จ",
          description: `ยินดีต้อนรับ ${user.firstName || user.fullName || ""}!`,
          className: "premium-card border-green-500/50 glow-green",
          duration: 3000,
        });
        sessionStorage.setItem("hasShownWelcome", "true");
      }
    }
  }, [isLoaded, user, toast]);

  return null;
}
