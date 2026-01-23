"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

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
  const pathname = usePathname();
  const accountMenuKey = session?.user?.role ?? "EMPLOYEE";

  function navClass(href: string) {
    const active =
      pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
    return (
      "px-4 py-2 rounded-2xl text-sm whitespace-nowrap transition select-none " +
      (active
        ? "bg-white/15 ring-1 ring-white/25 shadow-sm light:bg-black/10 light:ring-black/15"
        : "bg-white/5 hover:bg-white/10 light:bg-black/5 light:hover:bg-black/10")
    );
  }

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

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all">
        <header className="px-4 py-4 md:px-8 md:py-6 border-b border-white/5 bg-black/20 backdrop-blur light:bg-white/80 light:border-black/10 lg:pl-8 pl-16">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🌸</span>
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Sakura Biotech
                </h2>
                <p className="text-xs text-gray-400 hidden sm:block light:text-gray-600">
                  Co. Ltd
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* ✅ Top shortcuts ใหม่ (รูป 4) */}
              <div className="hidden md:block mr-2 max-w-[55vw] overflow-x-auto no-scrollbar px-1">
                <DashboardTopNav />
              </div>

              {/* (ของเดิมที่คุณใส่ไว้) */}
              <nav
                data-quick-nav
                className="hidden md:flex items-center gap-2 mr-2 max-w-[55vw] overflow-x-auto no-scrollbar px-1"
              >
                <Link className={navClass("/dashboard")} href="/dashboard">
                  ภาพรวม
                </Link>
                <Link className={navClass("/orders")} href="/orders">
                  คำสั่งซื้อ
                </Link>
                <Link className={navClass("/products")} href="/products">
                  สินค้า
                </Link>
                <Link className={navClass("/stock")} href="/stock">
                  สต็อก
                </Link>
                <Link className={navClass("/daily-summary")} href="/daily-summary">
                  สรุปวันนี้
                </Link>
                <Link className={navClass("/profit")} href="/profit">
                  กำไร
                </Link>
                <Link className={navClass("/system-settings")} href="/system-settings">
                  ตั้งค่า
                </Link>
              </nav>

              <NotificationBell />
              <AccountMenu key={accountMenuKey} />
            </div>
          </div>
        </header>

        <main className="dashboard-main flex-1 overflow-y-auto bg-gradient-dark light:bg-gradient-to-br light:from-gray-50 light:to-gray-100">
          <div className="p-4 md:p-8 space-y-4">{children}</div>
        </main>
      </div>

      <FloatingAssistant />
    </div>
  );
}
