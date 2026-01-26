"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

import { Sidebar } from "@/components/sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { AccountMenu } from "@/components/account-menu";
import { DashboardTopNav } from "@/components/dashboard/dashboard-top-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  // ✅ role บางโปรเจคไม่ได้ extend type ไว้ เลยอ่านแบบ any ให้ไม่ error
  const role = (session?.user as any)?.role ?? "EMPLOYEE";
  const accountMenuKey = role;
  const isAdmin = role === "ADMIN";

  useEffect(() => {
    const checkAlerts = async () => {
      await fetch("/api/notifications/check-alerts", { method: "POST" });
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-dark text-white light:bg-white light:text-black overflow-hidden">
      <Sidebar />

      {/* ✅ ใช้ dashboard-shell ให้ globals.css คุม margin-left ตอน sidebar ย่อ/ขยาย */}
      <div className="dashboard-shell flex-1 flex flex-col min-w-0">
        <header className="px-4 py-4 md:px-8 md:py-6 border-b border-white/5 bg-black/20 backdrop-blur light:bg-white/80 light:border-black/10 lg:pl-8 pl-16">
          <div className="flex items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🌸</span>
              </div>

              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Sakura Biotech
                </h2>
                <p className="text-xs text-gray-400 hidden sm:block light:text-gray-600">
                  Co. Ltd
                </p>
              </div>
            </div>

            {/* Right side: shortcuts + user */}
            <div className="flex items-center gap-2 min-w-0">
              {/* ✅ TopNav แถวเดียว: แสดงบน lg+ เท่านั้น (กันโผล่ 2 แถว) */}
              {isAdmin && (
                <div className="hidden lg:block mr-2 max-w-[52vw] overflow-x-auto no-scrollbar px-1">
                  <DashboardTopNav />
                </div>
              )}

              <NotificationBell />
              <AccountMenu key={accountMenuKey} />
            </div>
          </div>

          {/* ✅ ถ้าอยากให้จอ md โผล่ด้วย “แทน” ไม่ใช่เพิ่มอีกแถว:
              ให้เอา TopNav ด้านบนออก แล้วเปิด block นี้แทน
              ตอนนี้ปิดไว้เพื่อไม่ให้มี 2 แถว
          */}
          {/* {isAdmin && (
            <div className="hidden md:block lg:hidden mt-4">
              <DashboardTopNav />
            </div>
          )} */}
        </header>

        <main className="dashboard-main flex-1 overflow-y-auto bg-gradient-dark light:bg-gradient-to-br light:from-gray-50 light:to-gray-100">
          <div className="p-4 md:p-8 space-y-4">{children}</div>
        </main>
      </div>

      <FloatingAssistant />
    </div>
  );
}
