"use client";

import { Sidebar } from "@/components/sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { AIChatDialog } from "@/components/ai-chat-dialog";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="pl-64 transition-all duration-300">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 px-6">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">E-Commerce Management</h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">A</div>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
      <AIChatDialog />
    </div>
  );
}
