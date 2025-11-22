"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
// import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Megaphone,
  Wallet,
  FileBarChart,
  Calculator,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stock", label: "จัดการสินค้า", icon: Package },
  { href: "/ads", label: "โฆษณา", icon: Megaphone },
  { href: "/budget", label: "งบประมาณ", icon: Wallet },
  { href: "/reports", label: "รายงาน", icon: FileBarChart },
  { href: "/profit", label: "คำนวณกำไร", icon: Calculator },
  { href: "/automation", label: "Automation", icon: Zap },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/users", label: "ผู้ใช้งาน", icon: Users },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  // const { data: session } = useSession();
  
  // Mock session data ชั่วคราว
  const session = {
    user: {
      name: "Admin User",
      email: "admin@test.com",
      role: "ADMIN",
    },
  };
  
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    // await signOut({ callbackUrl: "/login" });
    // ปิด logout ชั่วคราว
    alert("Logout disabled for testing");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-slate-900 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
        {!collapsed && (
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            E-Commerce
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border-l-2 border-emerald-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-emerald-400")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-0 right-0 px-4 space-y-3">
        {/* User info and logout */}
        {session?.user && (
          <div className="space-y-2">
            {!collapsed && (
              <div className="px-3 py-2 text-xs text-slate-400">
                <p className="truncate">{session.user.name}</p>
                <p className="truncate text-slate-500">{session.user.email}</p>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={cn(
                "w-full justify-start text-slate-400 hover:text-white hover:bg-red-500/20",
                collapsed && "justify-center px-0"
              )}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="ml-3">ออกจากระบบ</span>}
            </Button>
          </div>
        )}

        {/* Powered by AI badge */}
        {!collapsed && (
          <div className="rounded-lg bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 p-3 border border-emerald-500/20">
            <p className="text-xs text-slate-400">Powered by AI</p>
            <p className="text-sm font-medium text-emerald-400">Gemini 2.0 Flash</p>
          </div>
        )}
      </div>
    </aside>
  );
}