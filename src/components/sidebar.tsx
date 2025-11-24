"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser, SignOutButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Megaphone,
  Wallet,
  FileBarChart,
  Calculator,
  Target,
  Zap,
  GitBranch,
  Users,
  Settings,
  Store,
  Bell,
  Bot,
  BarChart3,
  LogOut,
  Menu,
  X,
  FileText,
} from "lucide-react";

type UserRole = "ADMIN" | "STOCK" | "EMPLOYEE";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, color: "text-cyan-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/stock", label: "จัดการสินค้า", icon: Package, color: "text-purple-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/ads", label: "โฆษณา", icon: Megaphone, color: "text-pink-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/budget", label: "งบประมาณ", icon: Wallet, color: "text-amber-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/budget-requests", label: "Budget Requests", icon: FileText, color: "text-amber-500", roles: ["ADMIN", "STOCK"] },
  { href: "/reports", label: "รายงาน", icon: FileBarChart, color: "text-blue-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/analytics", label: "การวิเคราะห์", icon: BarChart3, badge: "New", color: "text-violet-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/profit", label: "คำนวณกำไร", icon: Calculator, color: "text-green-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/metrics", label: "แผน Metrics", icon: Target, badge: "New", color: "text-orange-400", roles: ["ADMIN", "EMPLOYEE"] },
  { href: "/automation", label: "กฎอัตโนมัติ", icon: Zap, badge: "New", color: "text-yellow-400", roles: ["ADMIN"] },
  { href: "/workflows", label: "n8n Workflow", icon: GitBranch, badge: "Beta", color: "text-indigo-400", roles: ["ADMIN"] },
  { href: "/ai-chat", label: "AI Chat", icon: Bot, badge: "New", color: "text-emerald-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot, badge: "AI", color: "text-blue-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/notifications", label: "การแจ้งเตือน", icon: Bell, color: "text-red-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/users", label: "ผู้ใช้งาน", icon: Users, color: "text-teal-400", roles: ["ADMIN"] },
  { href: "/settings", label: "ตั้งค่า", icon: Settings, color: "text-slate-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/me");
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    if (user) {
      fetchUserRole();
    }
  }, [user]);

  const visibleNavItems = userRole
    ? navItems.filter((item) => item.roles.includes(userRole))
    : navItems;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-r border-slate-700/50
        flex flex-col overflow-hidden shadow-2xl
        transform transition-transform duration-200 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
      <div className="p-6 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-400 via-rose-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/30 ring-2 ring-pink-400/20">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">Sakura</h1>
            <p className="text-xs text-slate-400">E-Commerce</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        <div className="space-y-1">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 group relative overflow-hidden",
                pathname === item.href
                  ? "bg-gradient-to-r from-slate-700/50 to-slate-800/50 text-white shadow-lg shadow-slate-900/20 ring-1 ring-slate-600/50"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", pathname === item.href ? item.color : "text-slate-400 group-hover:" + item.color)} />
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge && (
                <Badge className="ml-auto bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs px-2 py-0.5 shadow-sm">
                  {item.badge}
                </Badge>
              )}
              {pathname === item.href && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-400 to-rose-400 rounded-r-full" />
              )}
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors mb-2">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-10 h-10 ring-2 ring-pink-400/30",
                userButtonPopoverCard: "bg-slate-900 border-slate-700",
                userButtonPopoverActionButton: "hover:bg-slate-800",
              },
            }}
          />
          {user && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">
                {user.fullName}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user.primaryEmailAddress?.emailAddress}
              </p>
              {userRole && (
                <p className="text-xs text-pink-400 font-semibold mt-0.5">
                  {userRole === "ADMIN" && "แอดมิน"}
                  {userRole === "STOCK" && "พนักงานสต๊อก"}
                  {userRole === "EMPLOYEE" && "พนักงาน"}
                </p>
              )}
            </div>
          )}
        </div>

        <SignOutButton>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4 mr-2 text-red-400" />
            <span className="text-sm">ออกจากระบบ</span>
          </Button>
        </SignOutButton>
      </div>

      <div className="p-4 border-t border-slate-700/50 bg-slate-950/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Powered by AI</span>
          <span className="text-pink-400 font-semibold">Gemini 2.0</span>
        </div>
      </div>
    </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed bottom-4 right-4 lg:hidden z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
    </>
  );
}
