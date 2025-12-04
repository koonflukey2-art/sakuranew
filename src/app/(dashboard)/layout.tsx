"use client";

import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { UserSync } from "@/components/user-sync";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEffect } from "react";

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
        <div className="p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gradient-purple">Sakura</h2>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
          {children}
        </div>
      </main>
      <FloatingAssistant />
      <Toaster />
    </div>
  );
}
