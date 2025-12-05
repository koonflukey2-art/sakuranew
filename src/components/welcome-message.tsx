"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export function WelcomeMessage() {
  const { user, isLoaded } = useUser();
  const [hasShownWelcome, setHasShownWelcome] = useState(true); // Default true to prevent flash

  useEffect(() => {
    // Wait for user to be loaded
    if (!isLoaded || !user) return;

    // Check if welcome message has been shown this session
    const welcomeKey = `welcome_shown_${user.id}`;
    const hasShown = sessionStorage.getItem(welcomeKey);

    if (!hasShown) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        const userName = user.fullName || user.firstName || "คุณ";

        toast.success(`ยินดีต้อนรับเข้าสู่ระบบ ${userName}`, {
          description: "ขอให้มีความสุขกับการใช้งานระบบ Sakura E-Commerce",
          icon: <Sparkles className="h-5 w-5 text-purple-400" />,
          duration: 4000,
          className: "bg-gradient-to-r from-purple-900 to-pink-900 border-purple-500",
        });

        // Mark as shown for this session
        sessionStorage.setItem(welcomeKey, "true");
        setHasShownWelcome(true);
      }, 1000); // 1 second delay

      return () => clearTimeout(timer);
    } else {
      setHasShownWelcome(true);
    }
  }, [user, isLoaded]);

  return null; // This component doesn't render anything
}
