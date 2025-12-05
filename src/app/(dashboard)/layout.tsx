"use client";

import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { UserSync } from "@/components/user-sync";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { useEffect } from "react";
import { AccountMenu } from "@/components/account-menu";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { WelcomeMessage } from "@/components/welcome-message";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check alerts every 5 minutes
  useEffect(() => {
    const checkAlerts = async () => {
      await fetch("/api/notifications/check-alerts", { method: "POST" });
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex min-h-screen bg-gradient-dark text-white">
      <UserSync />
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-lg border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Sakura</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-gray-400 hover:text-white"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            <NotificationBell />
            <AccountMenu />
          </div>
        </div>
        <WelcomeMessage />
        <div className="p-6 md:p-8 space-y-4">{children}</div>
      </main>
      <FloatingAssistant />
      <Toaster />
    </div>
  );
}
