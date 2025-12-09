"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { UserSync } from "@/components/user-sync";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountMenu } from "@/components/account-menu";
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
    <div className="flex min-h-screen bg-gradient-dark text-white overflow-hidden">
      <UserSync />
      <WelcomeMessage />

      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-4 py-4 md:px-8 md:py-6 border-b border-white/5 bg-black/20 backdrop-blur lg:pl-8 pl-16">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🌸</span>
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Sakura Biotech
                </h2>
                <p className="text-xs text-gray-400 hidden sm:block">Co. Ltd</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell />
              <AccountMenu />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 space-y-4">{children}</div>
        </main>
      </div>

      <FloatingAssistant />
      <Toaster />
    </div>
  );
}
